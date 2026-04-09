import { useCallback } from 'react'

import { APIRoutes } from '@/api/routes'

import useChatActions from '@/hooks/useChatActions'
import { useStore } from '../store'
import { RunEvent, RunResponseContent, type RunResponse, type ReasoningSteps, type ToolSessionBlock, type ParsedMetadata, type ChatMessage, type CitationData } from '@/types/os'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import useAIResponseStream from './useAIResponseStream'
import { ToolCall } from '@/types/os'
import { useQueryState } from 'nuqs'

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const parseMetadata = (raw: Record<string, unknown>): ParsedMetadata => {
  const metrics = toRecord(raw.metrics)
  const extraData = toRecord(raw.extra_data)
  const tokenUsage: ParsedMetadata['token_usage'] = {
    input_tokens:
      typeof metrics?.input_tokens === 'number' ? metrics.input_tokens : undefined,
    output_tokens:
      typeof metrics?.output_tokens === 'number' ? metrics.output_tokens : undefined,
    total_tokens:
      typeof metrics?.total_tokens === 'number' ? metrics.total_tokens : undefined
  }

  let citations: CitationData[] | undefined
  const citationsRaw = raw.citations ?? extraData?.references
  if (Array.isArray(citationsRaw)) {
    const mapped = citationsRaw
      .map((item): CitationData | null => {
        const obj = toRecord(item)
        if (!obj) return null
        return {
          source_id:
            typeof obj.source_id === 'string'
              ? obj.source_id
              : typeof obj.id === 'string'
                ? obj.id
                : 'citation',
          title:
            typeof obj.title === 'string'
              ? obj.title
              : typeof obj.name === 'string'
                ? obj.name
                : 'Untitled source',
          url: typeof obj.url === 'string' ? obj.url : undefined,
          snippet:
            typeof obj.snippet === 'string'
              ? obj.snippet
              : typeof obj.content === 'string'
                ? obj.content
                : undefined,
          text: typeof obj.text === 'string' ? obj.text : undefined,
          source: typeof obj.source === 'string' ? obj.source : undefined
        }
      })
      .filter((v): v is CitationData => v !== null)
    citations = mapped
  }

  const reasoningStepsRaw = extraData?.reasoning_steps
  const reasoning_steps = Array.isArray(reasoningStepsRaw)
    ? (reasoningStepsRaw as ReasoningSteps[])
    : undefined

  return {
    event: typeof raw.event === 'string' ? raw.event : undefined,
    model: typeof raw.model === 'string' ? raw.model : undefined,
    token_usage: tokenUsage,
    citations,
    reasoning_steps,
    raw
  }
}

const extractRunContextFromMetadata = (raw: Record<string, unknown>) => {
  const context = toRecord(raw.context) ?? raw
  const out: {
    userspace?: string
    sessionspace?: string
    workspace?: string
    runspace?: string
    user_id?: string
    record_id?: string
    session_id?: string
    run_id?: string
    vibe_record_ids?: string[]
  } = {}

  const keys: Array<keyof Omit<typeof out, 'vibe_record_ids'>> = [
    'userspace',
    'sessionspace',
    'workspace',
    'runspace',
    'user_id',
    'record_id',
    'session_id',
    'run_id'
  ]

  for (const key of keys) {
    const value = context[key]
    if (typeof value === 'string' && value.trim()) out[key] = value
  }

  const vrids = context.vibe_record_ids
  if (Array.isArray(vrids)) {
    out.vibe_record_ids = vrids.filter((v): v is string => typeof v === 'string')
  }

  return out
}

const toolSessionIdFromTool = (tool: ToolCall): string =>
  tool.tool_call_id || `${tool.tool_name}-${tool.created_at}`

const upsertToolSessionsFromToolCalls = (
  message: ChatMessage,
  toolCalls: ToolCall[],
  eventType?: RunEvent
) => {
  const sessions = [...(message.tool_sessions ?? [])]
  const isCompletedEvent =
    eventType === RunEvent.ToolCallCompleted ||
    eventType === RunEvent.TeamToolCallCompleted
  for (const tool of toolCalls) {
    const id = toolSessionIdFromTool(tool)
    const index = sessions.findIndex((s) => s.id === id)
    const isResultLikeTool =
      typeof tool.tool_name === 'string' &&
      tool.tool_name.toLowerCase().includes('result')
    const toolResult =
      typeof (tool as unknown as { result?: unknown }).result === 'string'
        ? ((tool as unknown as { result?: string }).result ?? null)
        : null
    const inferredResult =
      toolResult ??
      tool.content ??
      (isResultLikeTool ? JSON.stringify(tool.tool_args ?? {}, null, 2) : null)

    const status: ToolSessionBlock['status'] = tool.tool_call_error
      ? 'error'
      : isCompletedEvent || !!inferredResult
        ? 'completed'
        : 'running'
    const partial: ToolSessionBlock = {
      id,
      tool_call_id: tool.tool_call_id,
      tool_name: tool.tool_name,
      status,
      started_at: tool.created_at,
      ended_at: status === 'running' ? undefined : (tool.created_at ?? Math.floor(Date.now() / 1000)),
      metrics_time: tool.metrics?.time,
      tool_args: tool.tool_args,
      result: inferredResult,
      error: tool.tool_call_error ? toolResult || tool.content || 'Tool call error' : undefined
    }
    if (index >= 0) {
      sessions[index] = { ...sessions[index], ...partial }
    } else {
      sessions.push(partial)
    }
  }
  message.tool_sessions = sessions
}

const appendToToolSessionStreaming = (
  message: ChatMessage,
  chunkText: string,
  preferredToolCallId?: string
) => {
  if (!chunkText) return false
  const sessions = [...(message.tool_sessions ?? [])]
  if (sessions.length === 0) return false

  let targetIndex = -1
  if (preferredToolCallId) {
    targetIndex = sessions.findIndex((s) => s.tool_call_id === preferredToolCallId)
  }
  if (targetIndex < 0) {
    targetIndex = sessions.findIndex((s) => s.status === 'running')
  }
  if (targetIndex < 0) {
    targetIndex = sessions.length - 1
  }
  if (targetIndex < 0) return false

  const target = sessions[targetIndex]
  sessions[targetIndex] = {
    ...target,
    streaming_text: `${target.streaming_text ?? ''}${chunkText}`
  }
  message.tool_sessions = sessions
  return true
}

const upsertSessionMetadata = (
  message: ChatMessage,
  metadataRaw: Record<string, unknown>,
  preferredToolCallId?: string
) => {
  const sessions = [...(message.tool_sessions ?? [])]
  if (sessions.length === 0) return
  let targetIndex = -1
  if (preferredToolCallId) {
    targetIndex = sessions.findIndex((s) => s.tool_call_id === preferredToolCallId)
  }
  if (targetIndex < 0) {
    targetIndex = sessions.findIndex((s) => s.status === 'running')
  }
  if (targetIndex < 0) targetIndex = sessions.length - 1
  if (targetIndex < 0) return

  const existingRaw = sessions[targetIndex].parsed_metadata?.raw ?? {}
  const mergedRaw = { ...existingRaw, ...metadataRaw }
  sessions[targetIndex] = {
    ...sessions[targetIndex],
    parsed_metadata: parseMetadata(mergedRaw)
  }
  message.tool_sessions = sessions
}

const tryParseJsonFromText = (text: string): Record<string, unknown> | null => {
  const trimmed = text.trim()
  const candidates = [trimmed]

  const fenceStart = trimmed.indexOf('```')
  if (fenceStart >= 0) {
    const firstBrace = trimmed.indexOf('{', fenceStart)
    const lastBrace = trimmed.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      candidates.push(trimmed.slice(firstBrace, lastBrace + 1))
    }
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1))
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      continue
    }
  }
  return null
}

const normalizeTodoPlan = (raw: Record<string, unknown>) => {
  const title = typeof raw.title === 'string' ? raw.title : 'Todo Plan'
  const target = typeof raw.target === 'string' ? raw.target : 'Current task'
  const plansRaw = Array.isArray(raw.plans)
    ? raw.plans
    : Array.isArray(raw.content)
      ? raw.content
      : []

  const plans = plansRaw
    .map((mission, missionIndex) => {
      const missionObj = toRecord(mission)
      if (!missionObj) return null
      const stepsRaw = Array.isArray(missionObj.steps) ? missionObj.steps : []
      const steps = stepsRaw
        .map((step, stepIndex) => {
          const stepObj = toRecord(step)
          if (!stepObj) return null
          const statusRaw = stepObj.status
          const status: 'pending' | 'completed' | 'failed' =
            statusRaw === 'completed' || statusRaw === 'failed' || statusRaw === 'pending'
              ? statusRaw
              : 'pending'
          return {
            step_id:
              typeof stepObj.step_id === 'number' ? stepObj.step_id : stepIndex + 1,
            title:
              typeof stepObj.title === 'string' ? stepObj.title : `Step ${stepIndex + 1}`,
            content:
              typeof stepObj.content === 'string' ? stepObj.content : '',
            tools: Array.isArray(stepObj.tools)
              ? stepObj.tools.filter((t): t is string => typeof t === 'string')
              : undefined,
            status
          }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)

      return {
        mission_id:
          typeof missionObj.mission_id === 'number'
            ? missionObj.mission_id
            : missionIndex + 1,
        title:
          typeof missionObj.title === 'string'
            ? missionObj.title
            : `Mission ${missionIndex + 1}`,
        tools: Array.isArray(missionObj.tools)
          ? missionObj.tools.filter((t): t is string => typeof t === 'string')
          : [],
        steps
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)

  if (plans.length === 0) return null
  return { title, target, plans }
}

const syncTodoPlanFromToolCalls = (message: ChatMessage) => {
  if (!message.tool_calls || message.tool_calls.length === 0) return
  const todoCalls = message.tool_calls.filter(
    (t) => t.tool_name === 'write_todo' || t.tool_name === 'update_todo'
  )
  if (todoCalls.length === 0) return

  const latest = todoCalls[todoCalls.length - 1]
  const resultText =
    (typeof (latest as unknown as { result?: unknown }).result === 'string'
      ? ((latest as unknown as { result?: string }).result ?? '')
      : '') ||
    latest.content ||
    ''

  if (!resultText.trim()) return
  const parsed = tryParseJsonFromText(resultText)
  if (!parsed) return
  const normalized = normalizeTodoPlan(parsed)
  if (!normalized) return
  message.todo_plan = normalized
}

const useAIChatStreamHandler = () => {
  const setMessages = useStore((state) => state.setMessages)
  const { addMessage, focusChatInput } = useChatActions()
  const [agentId] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [sessionId, setSessionId] = useQueryState('session')
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const mode = useStore((state) => state.mode)
  const setStreamingErrorMessage = useStore(
    (state) => state.setStreamingErrorMessage
  )
  const setIsStreaming = useStore((state) => state.setIsStreaming)
  const setSessionsData = useStore((state) => state.setSessionsData)
  const abortController = useStore((state) => state.abortController)
  const setAbortController = useStore((state) => state.setAbortController)
  const setRunContext = useStore((state) => state.setRunContext)
  const { streamResponse } = useAIResponseStream()

  const updateMessagesWithErrorState = useCallback(() => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages]
      const lastMessage = newMessages[newMessages.length - 1]
      if (lastMessage && lastMessage.role === 'agent') {
        lastMessage.streamingError = true
      }
      return newMessages
    })
  }, [setMessages])

  /**
   * Processes a new tool call and adds it to the message
   * @param toolCall - The tool call to add
   * @param prevToolCalls - The previous tool calls array
   * @returns Updated tool calls array
   */
  const processToolCall = useCallback(
    (toolCall: ToolCall, prevToolCalls: ToolCall[] = []) => {
      const toolCallId =
        toolCall.tool_call_id || `${toolCall.tool_name}-${toolCall.created_at}`

      const existingToolCallIndex = prevToolCalls.findIndex(
        (tc) =>
          (tc.tool_call_id && tc.tool_call_id === toolCall.tool_call_id) ||
          (!tc.tool_call_id &&
            toolCall.tool_name &&
            toolCall.created_at &&
            `${tc.tool_name}-${tc.created_at}` === toolCallId)
      )
      if (existingToolCallIndex >= 0) {
        const updatedToolCalls = [...prevToolCalls]
        updatedToolCalls[existingToolCallIndex] = {
          ...updatedToolCalls[existingToolCallIndex],
          ...toolCall
        }
        return updatedToolCalls
      } else {
        return [...prevToolCalls, toolCall]
      }
    },
    []
  )

  /**
   * Processes tool calls from a chunk, handling both single tool object and tools array formats
   * @param chunk - The chunk containing tool call data
   * @param existingToolCalls - The existing tool calls array
   * @returns Updated tool calls array
   */
  const processChunkToolCalls = useCallback(
    (
      chunk: RunResponseContent | RunResponse,
      existingToolCalls: ToolCall[] = []
    ) => {
      let updatedToolCalls = [...existingToolCalls]
      // Handle new single tool object format
      if (chunk.tool) {
        updatedToolCalls = processToolCall(chunk.tool, updatedToolCalls)
      }
      // Handle legacy tools array format
      if (chunk.tools && chunk.tools.length > 0) {
        for (const toolCall of chunk.tools) {
          updatedToolCalls = processToolCall(toolCall, updatedToolCalls)
        }
      }

      return updatedToolCalls
    },
    [processToolCall]
  )

  const handleStreamResponse = useCallback(
    async (
      input: string | FormData | { isStop?: boolean; isReplay?: boolean }
    ) => {
      const controlInput =
        typeof input === 'object' && !(input instanceof FormData) ? input : null

      if (controlInput?.isStop) {
        if (abortController) {
          abortController.abort()
          setAbortController(null)
          setIsStreaming(false)
        }
        return
      }

      const isReplayMode = !!controlInput?.isReplay

      setIsStreaming(true)
      const controller = new AbortController()
      setAbortController(controller)

      const formData = input instanceof FormData ? input : new FormData()
      if (typeof input === 'string') {
        formData.append('message', input)
      } else if (isReplayMode) {
        formData.append('message', 'Replay test.json stream')
      }

      setMessages((prevMessages) => {
        if (prevMessages.length >= 2) {
          const lastMessage = prevMessages[prevMessages.length - 1]
          const secondLastMessage = prevMessages[prevMessages.length - 2]
          if (
            lastMessage.role === 'agent' &&
            lastMessage.streamingError &&
            secondLastMessage.role === 'user'
          ) {
            return prevMessages.slice(0, -2)
          }
        }
        return prevMessages
      })

      addMessage({
        role: 'user',
        content: (formData.get('message') as string) || '',
        created_at: Math.floor(Date.now() / 1000)
      })

      addMessage({
        role: 'agent',
        content: '',
        tool_calls: [],
        streamingError: false,
        created_at: Math.floor(Date.now() / 1000) + 1
      })

      let lastContent = ''
      let newSessionId = sessionId
      try {
        const endpointUrl = constructEndpointUrl(selectedEndpoint)

        let RunUrl: string | null = null

        if (isReplayMode) {
          RunUrl = '/api/replay'
        } else {
          if (mode === 'team' && teamId) {
            RunUrl = APIRoutes.TeamRun(endpointUrl, teamId)
          } else if (mode === 'agent' && agentId) {
            RunUrl = APIRoutes.AgentRun(endpointUrl).replace(
              '{agent_id}',
              agentId
            )
          }

          if (!RunUrl) {
            updateMessagesWithErrorState()
            setStreamingErrorMessage('Please select an agent or team first.')
            setIsStreaming(false)
            return
          }

          formData.append('stream', 'true')
          formData.append('session_id', sessionId ?? '')
        }

        // Create headers with auth token if available
        const headers: Record<string, string> = {}
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`
        }

        await streamResponse({
          apiUrl: RunUrl,
          headers,
          requestBody: formData,
          onChunk: (chunk: RunResponse) => {
            if (
              chunk.event === RunEvent.RunStarted ||
              chunk.event === RunEvent.TeamRunStarted ||
              chunk.event === RunEvent.ReasoningStarted ||
              chunk.event === RunEvent.TeamReasoningStarted
            ) {
              newSessionId = chunk.session_id as string
              setSessionId(chunk.session_id as string)
              if (
                (!sessionId || sessionId !== chunk.session_id) &&
                chunk.session_id
              ) {
                const sessionData = {
                  session_id: chunk.session_id as string,
                  session_name: formData.get('message') as string,
                  created_at: chunk.created_at
                }
                setSessionsData((prevSessionsData) => {
                  const sessionExists = prevSessionsData?.some(
                    (session) => session.session_id === chunk.session_id
                  )
                  if (sessionExists) {
                    return prevSessionsData
                  }
                  return [sessionData, ...(prevSessionsData ?? [])]
                })
              }
            } else if (
              chunk.event === RunEvent.ToolCallStarted ||
              chunk.event === RunEvent.TeamToolCallStarted ||
              chunk.event === RunEvent.ToolCallCompleted ||
              chunk.event === RunEvent.TeamToolCallCompleted
            ) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.role === 'agent') {
                  lastMessage.tool_calls = processChunkToolCalls(
                    chunk,
                    lastMessage.tool_calls
                  )
                  if (lastMessage.tool_calls) {
                    upsertToolSessionsFromToolCalls(lastMessage, lastMessage.tool_calls, chunk.event)
                    syncTodoPlanFromToolCalls(lastMessage)
                  }
                }
                return newMessages
              })
            } else if (
              chunk.event === RunEvent.RunContent ||
              chunk.event === RunEvent.TeamRunContent
            ) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (
                  lastMessage &&
                  lastMessage.role === 'agent' &&
                  typeof chunk.content === 'string'
                ) {
                  const uniqueContent = chunk.content.replace(lastContent, '')
                  lastMessage.content += uniqueContent
                  lastContent = chunk.content

                  // Handle tool calls streaming
                  lastMessage.tool_calls = processChunkToolCalls(
                    chunk,
                    lastMessage.tool_calls
                  )
                  if (lastMessage.tool_calls) {
                    upsertToolSessionsFromToolCalls(lastMessage, lastMessage.tool_calls, chunk.event)
                    appendToToolSessionStreaming(lastMessage, uniqueContent)
                    syncTodoPlanFromToolCalls(lastMessage)
                  }
                  if (chunk.extra_data?.reasoning_steps) {
                    lastMessage.extra_data = {
                      ...lastMessage.extra_data,
                      reasoning_steps: chunk.extra_data.reasoning_steps
                    }
                  }

                  if (chunk.extra_data?.references) {
                    lastMessage.extra_data = {
                      ...lastMessage.extra_data,
                      references: chunk.extra_data.references
                    }
                  }

                  lastMessage.created_at =
                    chunk.created_at ?? lastMessage.created_at
                  if (chunk.images) {
                    lastMessage.images = chunk.images
                  }
                  if (chunk.videos) {
                    lastMessage.videos = chunk.videos
                  }
                  if (chunk.audio) {
                    lastMessage.audio = chunk.audio
                  }
                } else if (
                  lastMessage &&
                  lastMessage.role === 'agent' &&
                  typeof chunk?.content !== 'string' &&
                  chunk.content !== null &&
                  chunk.content !== undefined
                ) {
                  lastMessage.protocols = lastMessage.protocols || []
                  lastMessage.protocols.push({
                    content_type: chunk.content_type || 'unknown',
                    data: chunk.content
                  })
                } else if (
                  chunk.response_audio?.transcript &&
                  typeof chunk.response_audio?.transcript === 'string'
                ) {
                  const transcript = chunk.response_audio.transcript
                  lastMessage.response_audio = {
                    ...lastMessage.response_audio,
                    transcript:
                      lastMessage.response_audio?.transcript + transcript
                  }
                }
                return newMessages
              })
            } else if (chunk.event === RunEvent.CustomEvent) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (!lastMessage || lastMessage.role !== 'agent') return newMessages

                // Parse standard Agno events wrapped in metadata
                const chunkAny = chunk as unknown as Record<string, unknown> & {
                  metadata?: {
                    event?: string
                    agent_id?: string
                    metadata?: Record<string, unknown>
                    content?: string
                    extra_data?: {
                      reasoning_steps?: ReasoningSteps[]
                    }
                    tool_calls?: ToolCall[]
                  }
                }

                if (chunkAny.metadata && typeof chunkAny.metadata === 'object' && (chunkAny.metadata as Record<string, unknown>).event) {
                  const innerChunk = chunkAny.metadata as unknown as typeof chunk & {
                    event?: string
                    agent_id?: string
                    metadata?: Record<string, unknown>
                    content?: string
                    extra_data?: {
                      reasoning_steps?: ReasoningSteps[]
                    }
                    tool_calls?: ToolCall[]
                  }

                  lastMessage.sub_messages = lastMessage.sub_messages || [];
                  if (lastMessage.sub_messages.length === 0) {
                    lastMessage.sub_messages.push({
                      agent_name: (innerChunk.agent_id as string) || 'subagent',
                      content: '',
                      tool_calls: [],
                      created_at: Math.floor(Date.now() / 1000)
                    });
                  }
                  const lastSubMessage = lastMessage.sub_messages[lastMessage.sub_messages.length - 1];

                  // Store metadata for right sidebar inspector
                  if (innerChunk.metadata && typeof innerChunk.metadata === 'object' && Object.keys(innerChunk.metadata as Record<string, unknown>).length > 0) {
                    const existingMeta = (lastSubMessage as unknown as Record<string, unknown>).metadata || {};
                    (lastSubMessage as unknown as Record<string, unknown>).metadata = { ...existingMeta, ...innerChunk.metadata };
                  }

                  if (
                    innerChunk.event === RunEvent.ToolCallStarted ||
                    innerChunk.event === RunEvent.TeamToolCallStarted ||
                    innerChunk.event === RunEvent.ToolCallCompleted ||
                    innerChunk.event === RunEvent.TeamToolCallCompleted
                  ) {
                    lastSubMessage.tool_calls = processChunkToolCalls(innerChunk as unknown as typeof chunk, lastSubMessage.tool_calls)
                    const toolCalls = processChunkToolCalls(innerChunk as unknown as typeof chunk, lastMessage.tool_calls)
                    lastMessage.tool_calls = toolCalls
                    upsertToolSessionsFromToolCalls(lastMessage, toolCalls, innerChunk.event as RunEvent)
                    syncTodoPlanFromToolCalls(lastMessage)
                  } else if (
                    innerChunk.event === RunEvent.RunContent ||
                    innerChunk.event === RunEvent.TeamRunContent
                  ) {
                    if (typeof innerChunk.content === 'string') {
                      const uniqueContent = innerChunk.content.replace(lastSubMessage.content, '')
                      lastSubMessage.content += uniqueContent

                      lastSubMessage.tool_calls = processChunkToolCalls(innerChunk as unknown as typeof chunk, lastSubMessage.tool_calls)
                      const toolCalls = processChunkToolCalls(innerChunk as unknown as typeof chunk, lastMessage.tool_calls)
                      lastMessage.tool_calls = toolCalls
                      upsertToolSessionsFromToolCalls(lastMessage, toolCalls, innerChunk.event as RunEvent)
                      appendToToolSessionStreaming(lastMessage, uniqueContent)
                      syncTodoPlanFromToolCalls(lastMessage)
                      if (innerChunk.extra_data?.reasoning_steps) {
                        lastSubMessage.extra_data = {
                          ...lastSubMessage.extra_data,
                          reasoning_steps: innerChunk.extra_data.reasoning_steps
                        }
                      }
                    }
                  } else if (
                    innerChunk.event === RunEvent.ReasoningStep ||
                    innerChunk.event === RunEvent.TeamReasoningStep
                  ) {
                    const existingSteps = lastSubMessage.extra_data?.reasoning_steps ?? []
                    const incomingSteps = (innerChunk.extra_data as (typeof lastSubMessage.extra_data))?.reasoning_steps ?? []
                    lastSubMessage.extra_data = {
                      ...lastSubMessage.extra_data,
                      reasoning_steps: [...existingSteps, ...incomingSteps]
                    }
                  }

                  if (innerChunk.metadata && typeof innerChunk.metadata === 'object') {
                    upsertSessionMetadata(lastMessage, innerChunk.metadata)
                    const extracted = extractRunContextFromMetadata(innerChunk.metadata)
                    if (Object.keys(extracted).length > 0) {
                      setRunContext((prev) => ({ ...(prev ?? {}), ...extracted }))
                    }
                  }
                } else if (chunkAny.type === 'content' && typeof chunk.content === 'string') {
                  // Direct merge for content type custom events
                  const uniqueContent = chunk.content.replace(lastContent, '')
                  const attached = appendToToolSessionStreaming(lastMessage, uniqueContent)
                  if (!attached) {
                    lastMessage.content += uniqueContent
                  }
                  lastContent = chunk.content
                  if (chunkAny.metadata && typeof chunkAny.metadata === 'object') {
                    upsertSessionMetadata(lastMessage, chunkAny.metadata)
                    const extracted = extractRunContextFromMetadata(chunkAny.metadata)
                    if (Object.keys(extracted).length > 0) {
                      setRunContext((prev) => ({ ...(prev ?? {}), ...extracted }))
                    }
                  }
                } else if (chunkAny.type === 'citation') {
                  const metadataObj = toRecord(chunkAny.metadata)
                  const parsed = metadataObj ? parseMetadata(metadataObj) : undefined
                  if (parsed?.citations && parsed.citations.length > 0) {
                    lastMessage.citations = [...(lastMessage.citations ?? []), ...parsed.citations]
                  }
                  if (metadataObj) {
                    const extracted = extractRunContextFromMetadata(metadataObj)
                    if (Object.keys(extracted).length > 0) {
                      setRunContext((prev) => ({ ...(prev ?? {}), ...extracted }))
                    }
                  }
                }
                return newMessages;
              })
            } else if (
              chunk.event === RunEvent.ReasoningStep ||
              chunk.event === RunEvent.TeamReasoningStep
            ) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.role === 'agent') {
                  const existingSteps =
                    lastMessage.extra_data?.reasoning_steps ?? []
                  const incomingSteps = chunk.extra_data?.reasoning_steps ?? []
                  lastMessage.extra_data = {
                    ...lastMessage.extra_data,
                    reasoning_steps: [...existingSteps, ...incomingSteps]
                  }
                }
                return newMessages
              })
            } else if (
              chunk.event === RunEvent.ReasoningCompleted ||
              chunk.event === RunEvent.TeamReasoningCompleted
            ) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.role === 'agent') {
                  if (chunk.extra_data?.reasoning_steps) {
                    lastMessage.extra_data = {
                      ...lastMessage.extra_data,
                      reasoning_steps: chunk.extra_data.reasoning_steps
                    }
                  }
                }
                return newMessages
              })
            } else if (
              chunk.event === RunEvent.RunError ||
              chunk.event === RunEvent.TeamRunError ||
              chunk.event === RunEvent.TeamRunCancelled
            ) {
              updateMessagesWithErrorState()
              const errorContent =
                (chunk.content as string) ||
                (chunk.event === RunEvent.TeamRunCancelled
                  ? 'Run cancelled'
                  : 'Error during run')
              setStreamingErrorMessage(errorContent)
              if (newSessionId) {
                setSessionsData(
                  (prevSessionsData) =>
                    prevSessionsData?.filter(
                      (session) => session.session_id !== newSessionId
                    ) ?? null
                )
              }
            } else if (
              chunk.event === RunEvent.UpdatingMemory ||
              chunk.event === RunEvent.TeamMemoryUpdateStarted ||
              chunk.event === RunEvent.TeamMemoryUpdateCompleted
            ) {
              // No-op for now; could surface a lightweight UI indicator in the future
            } else if (
              chunk.event === RunEvent.RunCompleted ||
              chunk.event === RunEvent.TeamRunCompleted
            ) {
              setMessages((prevMessages) => {
                const newMessages = prevMessages.map((message, index) => {
                  if (
                    index === prevMessages.length - 1 &&
                    message.role === 'agent'
                  ) {
                    let updatedContent: string
                    if (typeof chunk.content === 'string') {
                      updatedContent = chunk.content
                    } else {
                      try {
                        updatedContent = JSON.stringify(chunk.content)
                      } catch {
                        updatedContent = 'Error parsing response'
                      }
                    }
                    const next = {
                      ...message,
                      content: updatedContent,
                      tool_calls: processChunkToolCalls(
                        chunk,
                        message.tool_calls
                      ),
                      images: chunk.images ?? message.images,
                      videos: chunk.videos ?? message.videos,
                      response_audio: chunk.response_audio,
                      created_at: chunk.created_at ?? message.created_at,
                      extra_data: {
                        reasoning_steps:
                          chunk.extra_data?.reasoning_steps ??
                          message.extra_data?.reasoning_steps,
                        references:
                          chunk.extra_data?.references ??
                          message.extra_data?.references
                      }
                    }
                    if (next.tool_sessions && next.tool_sessions.length > 0) {
                      next.tool_sessions = next.tool_sessions.map((s) =>
                        s.status === 'running' ? { ...s, status: 'completed', ended_at: chunk.created_at ?? s.ended_at } : s
                      )
                    }
                    syncTodoPlanFromToolCalls(next)
                    return next
                  }
                  return message
                })
                return newMessages
              })
            }
          },
          onError: (error) => {
            updateMessagesWithErrorState()
            setStreamingErrorMessage(error.message)
            if (newSessionId) {
              setSessionsData(
                (prevSessionsData) =>
                  prevSessionsData?.filter(
                    (session) => session.session_id !== newSessionId
                  ) ?? null
              )
            }
          },
          onComplete: () => { },
          signal: controller.signal
        })
      } catch (error) {
        updateMessagesWithErrorState()
        setStreamingErrorMessage(
          error instanceof Error ? error.message : String(error)
        )
        if (newSessionId) {
          setSessionsData(
            (prevSessionsData) =>
              prevSessionsData?.filter(
                (session) => session.session_id !== newSessionId
              ) ?? null
          )
        }
      } finally {
        focusChatInput()
        setIsStreaming(false)
        setAbortController(null)
      }
    },
    [
      setMessages,
      addMessage,
      updateMessagesWithErrorState,
      selectedEndpoint,
      authToken,
      streamResponse,
      agentId,
      teamId,
      mode,
      setStreamingErrorMessage,
      setIsStreaming,
      focusChatInput,
      setSessionsData,
      sessionId,
      setSessionId,
      processChunkToolCalls,
      abortController,
      setAbortController,
      setRunContext
    ]
  )

  const stopStreaming = useCallback(() => {
    handleStreamResponse({ isStop: true })
  }, [handleStreamResponse])

  return { handleStreamResponse, stopStreaming }
}

export default useAIChatStreamHandler
