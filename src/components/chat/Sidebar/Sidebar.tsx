'use client'
import { Button } from '@/components/ui/button'
import { ModeSelector } from '@/components/chat/Sidebar/ModeSelector'
import { EntitySelector } from '@/components/chat/Sidebar/EntitySelector'
import useChatActions from '@/hooks/useChatActions'
import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'
import Icon from '@/components/ui/icon'
import { getProviderIcon } from '@/lib/modelProvider'
import Sessions from './Sessions'
import AuthToken from './AuthToken'
import { isValidUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueryState } from 'nuqs'
import { truncateText } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { ChatMessage } from '@/types/os'

const ENDPOINT_PLACEHOLDER = 'NO ENDPOINT ADDED'
const SidebarHeader = () => (
  <div className="flex items-center gap-2">
    <Icon type="agno" size="xs" />
    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-100">Agent UI</span>
  </div>
)

const NewChatButton = ({
  disabled,
  onClick
}: {
  disabled: boolean
  onClick: () => void
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    size="lg"
    className="h-9 w-full rounded-xl bg-cyan-300 text-xs font-semibold tracking-[0.04em] text-slate-950 hover:bg-cyan-200"
  >
    <Icon type="plus-icon" size="xs" className="text-background" />
    <span className="uppercase">New Chat</span>
  </Button>
)

const ReplayButton = ({
  disabled,
  onClick
}: {
  disabled: boolean
  onClick: () => void
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    size="lg"
    variant="secondary"
    className="h-9 w-full rounded-xl border-cyan-300/40 bg-cyan-400/12 text-xs font-semibold tracking-[0.04em] text-cyan-100 hover:bg-cyan-400/20"
  >
    <Icon type="refresh" size="xs" className="text-cyan-300" />
    <span className="uppercase">Replay test.json</span>
  </Button>
)

const SyncArtifactsButton = ({
  disabled,
  onClick
}: {
  disabled: boolean
  onClick: () => void
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    size="lg"
    variant="secondary"
    className="h-9 w-full rounded-xl border-emerald-300/40 bg-emerald-400/12 text-xs font-semibold tracking-[0.04em] text-emerald-100 hover:bg-emerald-400/20"
  >
    <Icon type="save" size="xs" className="text-emerald-300" />
    <span className="uppercase">Sync local JSON</span>
  </Button>
)

const AutoSyncToggleButton = ({
  active,
  disabled,
  onClick
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    size="lg"
    variant="secondary"
    className={`h-9 w-full rounded-xl text-xs font-semibold tracking-[0.04em] ${
      active
        ? 'border-amber-300/50 bg-amber-400/16 text-amber-100 hover:bg-amber-400/24'
        : 'border-white/20 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
    }`}
  >
    <Icon type="sheet" size="xs" className={active ? 'text-amber-200' : 'text-slate-300'} />
    <span className="uppercase">Auto Sync {active ? 'ON' : 'OFF'}</span>
  </Button>
)

const ModelDisplay = ({ model }: { model: string }) => (
  <div className="flex h-9 w-full items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] p-3 text-xs font-semibold uppercase text-slate-200">
    {(() => {
      const icon = getProviderIcon(model)
      return icon ? <Icon type={icon} className="shrink-0" size="xs" /> : null
    })()}
    {model}
  </div>
)

const Endpoint = () => {
  const {
    selectedEndpoint,
    isEndpointActive,
    setSelectedEndpoint,
    setAgents,
    setSessionsData,
    setMessages
  } = useStore()
  const { initialize } = useChatActions()
  const [isEditing, setIsEditing] = useState(false)
  const [endpointValue, setEndpointValue] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [, setAgentId] = useQueryState('agent')
  const [, setSessionId] = useQueryState('session')

  useEffect(() => {
    setEndpointValue(selectedEndpoint)
    setIsMounted(true)
  }, [selectedEndpoint])

  const getStatusColor = (isActive: boolean) =>
    isActive ? 'bg-positive' : 'bg-destructive'

  const handleSave = async () => {
    if (!isValidUrl(endpointValue)) {
      toast.error('Please enter a valid URL')
      return
    }
    const cleanEndpoint = endpointValue.replace(/\/$/, '').trim()
    setSelectedEndpoint(cleanEndpoint)
    setAgentId(null)
    setSessionId(null)
    setIsEditing(false)
    setIsHovering(false)
    setAgents([])
    setSessionsData([])
    setMessages([])
  }

  const handleCancel = () => {
    setEndpointValue(selectedEndpoint)
    setIsEditing(false)
    setIsHovering(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleRefresh = async () => {
    setIsRotating(true)
    await initialize()
    setTimeout(() => setIsRotating(false), 500)
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">AgentOS</div>
      {isEditing ? (
        <div className="flex w-full items-center gap-1">
          <input
            type="text"
            value={endpointValue}
            onChange={(e) => setEndpointValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex h-9 w-full items-center text-ellipsis rounded-xl border border-white/15 bg-white/[0.04] p-3 text-xs font-medium text-slate-100"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="hover:cursor-pointer hover:bg-transparent"
          >
            <Icon type="save" size="xs" />
          </Button>
        </div>
      ) : (
        <div className="flex w-full items-center gap-1">
          <motion.div
            className="relative flex h-9 w-full cursor-pointer items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] p-3 uppercase"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => setIsEditing(true)}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <AnimatePresence mode="wait">
              {isHovering ? (
                <motion.div
                  key="endpoint-display-hover"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-primary">
                    <Icon type="edit" size="xxs" /> EDIT AGENTOS
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="endpoint-display"
                  className="absolute inset-0 flex items-center justify-between px-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs font-medium text-slate-200">
                    {isMounted
                      ? truncateText(selectedEndpoint, 21) ||
                        ENDPOINT_PLACEHOLDER
                      : 'http://localhost:7777'}
                  </p>
                  <div
                    className={`size-2 shrink-0 rounded-full ${getStatusColor(isEndpointActive)}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="hover:cursor-pointer hover:bg-transparent"
          >
            <motion.div
              key={isRotating ? 'rotating' : 'idle'}
              animate={{ rotate: isRotating ? 360 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <Icon type="refresh" size="xs" />
            </motion.div>
          </Button>
        </div>
      )}
    </div>
  )
}

const Sidebar = ({
  hasEnvToken,
  envToken
}: {
  hasEnvToken?: boolean
  envToken?: string
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [syncMeta, setSyncMeta] = useState<{
    lastSyncedAt?: number
    todoPath?: string
    subagentPath?: string
    runs?: Array<{ name: string; path: string; is_dir: boolean; updated_at: number; size: number }>
  } | null>(null)
  const { clearChat, focusChatInput, initialize } = useChatActions()
  const { handleStreamResponse } = useAIChatStreamHandler()
  const {
    messages,
    selectedEndpoint,
    isEndpointActive,
    selectedModel,
    hydrated,
    isEndpointLoading,
    mode,
    runContext,
    isStreaming,
    setMessages
  } = useStore()
  const [isMounted, setIsMounted] = useState(false)
  const lastArtifactSignatureRef = useRef<string>('')
  const syncBackoffRef = useRef(0)
  const [agentId] = useQueryState('agent')
  const [teamId] = useQueryState('team')

  useEffect(() => {
    setIsMounted(true)

    if (hydrated) initialize()
  }, [selectedEndpoint, initialize, hydrated, mode])

  const handleNewChat = () => {
    clearChat()
    focusChatInput()
  }

  const handleReplay = async () => {
    clearChat()
    await handleStreamResponse({ isReplay: true })
  }

  const toRecord = useCallback((v: unknown): Record<string, unknown> | null => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
    return v as Record<string, unknown>
  }, [])

  const normalizeTodoPlan = useCallback((raw: Record<string, unknown>) => {
    const title = typeof raw.title === 'string' ? raw.title : 'Todo Plan'
    const target = typeof raw.target === 'string' ? raw.target : 'Current task'
    const plansRaw = Array.isArray(raw.plans)
      ? raw.plans
      : Array.isArray(raw.content)
        ? raw.content
        : []
    const plans = plansRaw
      .map((mission, missionIndex) => {
        const m = toRecord(mission)
        if (!m) return null
        const stepsRaw = Array.isArray(m.steps) ? m.steps : []
        const steps = stepsRaw
          .map((step, stepIndex) => {
            const s = toRecord(step)
            if (!s) return null
            const statusRaw = s.status
            const status: 'pending' | 'completed' | 'failed' =
              statusRaw === 'completed' || statusRaw === 'failed' || statusRaw === 'pending'
                ? statusRaw
                : 'pending'
            return {
              step_id: typeof s.step_id === 'number' ? s.step_id : stepIndex + 1,
              title: typeof s.title === 'string' ? s.title : `Step ${stepIndex + 1}`,
              content: typeof s.content === 'string' ? s.content : '',
              tools: Array.isArray(s.tools) ? s.tools.filter((t): t is string => typeof t === 'string') : undefined,
              status
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
        return {
          mission_id: typeof m.mission_id === 'number' ? m.mission_id : missionIndex + 1,
          title: typeof m.title === 'string' ? m.title : `Mission ${missionIndex + 1}`,
          tools: Array.isArray(m.tools) ? m.tools.filter((t): t is string => typeof t === 'string') : [],
          steps
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (plans.length === 0) return null
    return { title, target, plans }
  }, [toRecord])

  const handleSyncLocalArtifacts = useCallback(async (options?: { silent?: boolean }) => {
    const silent = !!options?.silent
    const query = new URLSearchParams()
    if (runContext?.workspace) query.set('workspace', runContext.workspace)
    if (runContext?.runspace) query.set('runspace', runContext.runspace)
    if (runContext?.session_id) query.set('session_id', runContext.session_id)

    const res = await fetch(`/api/local-artifacts?${query.toString()}`)
    if (!res.ok) {
      if (!silent) toast.error('Sync local JSON failed')
      syncBackoffRef.current = Math.min(6, syncBackoffRef.current + 1)
      return false
    }

    const data = (await res.json()) as {
      todo?: { path?: string; updated_at?: number; data?: Record<string, unknown> } | null
      subagentcard?: { path?: string; updated_at?: number; data?: Record<string, unknown> } | null
      runs?: Array<{ name: string; path: string; is_dir: boolean; updated_at: number; size: number }>
    }

    const todoRaw = data.todo?.data
    const subRaw = data.subagentcard?.data
    const runs = Array.isArray(data.runs) ? data.runs : []
    if (!todoRaw && !subRaw && runs.length === 0) {
      if (!silent) toast.info('No local todo/subagentcard JSON found')
      syncBackoffRef.current = Math.min(6, syncBackoffRef.current + 1)
      return false
    }

    const signature = JSON.stringify({
      todoPath: data.todo?.path ?? null,
      todoUpdated: data.todo?.updated_at ?? null,
      subPath: data.subagentcard?.path ?? null,
      subUpdated: data.subagentcard?.updated_at ?? null,
      runs: runs.map((r) => ({ name: r.name, path: r.path, updated_at: r.updated_at, size: r.size, is_dir: r.is_dir }))
    })
    if (signature === lastArtifactSignatureRef.current) {
      syncBackoffRef.current = Math.min(6, syncBackoffRef.current + 1)
      return false
    }
    lastArtifactSignatureRef.current = signature
    syncBackoffRef.current = 0

    setMessages((prev: ChatMessage[]) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (!last || last.role !== 'agent') return prev

      if (todoRaw) {
        const normalized = normalizeTodoPlan(todoRaw)
        if (normalized) {
          last.todo_plan = normalized
        }
      }

      if (subRaw) {
        const content =
          typeof subRaw.content === 'string'
            ? subRaw.content
            : typeof subRaw.description === 'string'
              ? `${subRaw.description}${typeof subRaw.instructions === 'string' ? `\n\n${subRaw.instructions}` : ''}`
              : JSON.stringify(subRaw)
        const agentName =
          typeof subRaw.agent_name === 'string'
            ? subRaw.agent_name
            : typeof subRaw.name === 'string'
              ? subRaw.name
              : 'subagent'
        const nextSubMessages = [...(last.sub_messages ?? [])]
        const existingIndex = nextSubMessages.findIndex((m) => m.agent_name === agentName)
        const nextItem = {
          agent_name: agentName,
          content,
          created_at: Math.floor(Date.now() / 1000),
          metadata: {
            ...subRaw,
            __artifact_path: data.subagentcard?.path,
            __updated_at: data.subagentcard?.updated_at,
            __runs: runs
          }
        }
        if (existingIndex >= 0) {
          nextSubMessages[existingIndex] = {
            ...nextSubMessages[existingIndex],
            ...nextItem
          }
        } else {
          nextSubMessages.push(nextItem)
        }
        last.sub_messages = nextSubMessages
      }

      return next
    })

    setSyncMeta({
      lastSyncedAt: Math.floor(Date.now() / 1000),
      todoPath: data.todo?.path,
      subagentPath: data.subagentcard?.path,
      runs
    })

    if (!silent) toast.success('Local JSON synced into current chat')
    return true
  }, [runContext?.workspace, runContext?.runspace, runContext?.session_id, setMessages, normalizeTodoPlan])

  useEffect(() => {
    if (!autoSyncEnabled) return
    syncBackoffRef.current = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const loop = async () => {
      if (cancelled) return
      await handleSyncLocalArtifacts({ silent: true })
      const nextDelay = Math.min(12000, 2500 + syncBackoffRef.current * 1500)
      timer = setTimeout(() => {
        void loop()
      }, nextDelay)
    }

    timer = setTimeout(() => {
      void loop()
    }, 500)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [autoSyncEnabled, handleSyncLocalArtifacts])

  const openLocalPath = useCallback(async (absolutePath: string) => {
    try {
      const normalized = absolutePath.replace(/\\/g, '/')
      const url = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      await navigator.clipboard.writeText(absolutePath)
      toast.info('Open failed, path copied to clipboard')
    }
  }, [])

  const formatRelativeTime = useCallback((unixSec?: number) => {
    if (!unixSec) return 'unknown'
    const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSec)
    if (diff < 5) return 'just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }, [])

  const formatRunSize = useCallback((size: number, isDir: boolean) => {
    if (isDir) return 'DIR'
    if (size <= 0) return '0 B'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }, [])

  return (
    <motion.aside
      className="pane-sidebar relative flex h-full shrink-0 grow-0 flex-col overflow-hidden px-2 py-3 font-dmmono"
      initial={{ width: '16rem' }}
      animate={{ width: isCollapsed ? '2.5rem' : '16rem' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-2 top-2 z-10 p-1"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
        whileTap={{ scale: 0.95 }}
      >
        <Icon
          type="sheet"
          size="xs"
          className={`transform ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
        />
      </motion.button>
      <motion.div
        className="w-60 space-y-5"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -20 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          pointerEvents: isCollapsed ? 'none' : 'auto'
        }}
      >
        <SidebarHeader />
        <NewChatButton
          disabled={messages.length === 0}
          onClick={handleNewChat}
        />
        <ReplayButton disabled={isStreaming} onClick={handleReplay} />
        <SyncArtifactsButton disabled={isStreaming} onClick={() => void handleSyncLocalArtifacts()} />
        <AutoSyncToggleButton
          active={autoSyncEnabled}
          disabled={isStreaming}
          onClick={() => setAutoSyncEnabled((v) => !v)}
        />
        {syncMeta && (
          <div className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-200">Artifact Sync</div>
            <div className="text-[10px] text-slate-200">last sync: {new Date((syncMeta.lastSyncedAt ?? 0) * 1000).toLocaleTimeString()}</div>
            {syncMeta.todoPath ? (
              <div className="text-[10px] text-emerald-200 break-all">
                todo: <span className="font-mono text-slate-200">{syncMeta.todoPath}</span>
              </div>
            ) : null}
            {syncMeta.subagentPath ? (
              <div className="text-[10px] text-cyan-200 break-all">
                subagent: <span className="font-mono text-slate-200">{syncMeta.subagentPath}</span>
              </div>
            ) : null}
            {syncMeta.runs && syncMeta.runs.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-violet-200">runs</div>
                <div className="max-h-32 overflow-auto space-y-1 pr-1">
                  {syncMeta.runs.slice(0, 8).map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      onClick={() => void openLocalPath(entry.path)}
                      className="w-full text-left rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10"
                      title={entry.path}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono break-all">{entry.is_dir ? '📁' : '📄'} {entry.name}</span>
                        <span className="text-[9px] text-slate-400">{formatRunSize(entry.size, entry.is_dir)}</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-slate-400">{formatRelativeTime(entry.updated_at)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
        {isMounted && (
          <>
            <Endpoint />
            {runContext && (
              <motion.div
                className="flex w-full flex-col items-start gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">Runtime Context</div>
                <div className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-3 space-y-2">
                  {runContext.workspace && (
                    <div className="text-[10px] leading-relaxed text-slate-200">
                      <span className="text-slate-300 uppercase tracking-wider">workspace</span>
                      <div className="mt-1 font-mono text-[10px] break-all text-cyan-300">{runContext.workspace}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {runContext.session_id ? (
                      <div>
                        <span className="text-slate-300 uppercase tracking-wider">session</span>
                        <div className="font-mono text-slate-300 truncate">{runContext.session_id}</div>
                      </div>
                    ) : null}
                    {runContext.run_id ? (
                      <div>
                        <span className="text-slate-300 uppercase tracking-wider">run</span>
                        <div className="font-mono text-slate-300 truncate">{runContext.run_id}</div>
                      </div>
                    ) : null}
                    {runContext.record_id ? (
                      <div>
                        <span className="text-slate-300 uppercase tracking-wider">record</span>
                        <div className="font-mono text-slate-300 truncate">{runContext.record_id}</div>
                      </div>
                    ) : null}
                    {runContext.user_id ? (
                      <div>
                        <span className="text-slate-300 uppercase tracking-wider">user</span>
                        <div className="font-mono text-slate-300 truncate">{runContext.user_id}</div>
                      </div>
                    ) : null}
                  </div>
                  {runContext.vibe_record_ids && runContext.vibe_record_ids.length > 0 ? (
                    <div className="text-[10px]">
                      <span className="text-slate-300 uppercase tracking-wider">vibe records</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {runContext.vibe_record_ids.slice(0, 4).map((rid) => (
                          <span key={rid} className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-cyan-300">{rid}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
            <AuthToken hasEnvToken={hasEnvToken} envToken={envToken} />
            {isEndpointActive && (
              <>
                <motion.div
                  className="flex w-full flex-col items-start gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">
                    Mode
                  </div>
                  {isEndpointLoading ? (
                    <div className="flex w-full flex-col gap-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton
                          key={index}
                          className="h-9 w-full rounded-xl"
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <ModeSelector />
                      <EntitySelector />
                      {selectedModel && (agentId || teamId) && (
                        <ModelDisplay model={selectedModel} />
                      )}
                    </>
                  )}
                </motion.div>
                <Sessions />
              </>
            )}
          </>
        )}
      </motion.div>
    </motion.aside>
  )
}

export default Sidebar
