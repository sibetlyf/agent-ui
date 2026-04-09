import type { ChatMessage } from '@/types/os'

import { AgentMessage, UserMessage } from './MessageItem'
import Tooltip from '@/components/ui/tooltip'
import { useStore } from '@/store'
import { memo } from 'react'
import {
  ToolCallProps,
  ReasoningStepProps,
  ReasoningProps,
  ReferenceData,
  Reference
} from '@/types/os'
import React, { type FC } from 'react'

import Icon from '@/components/ui/icon'
import ChatBlankState from './ChatBlankState'

interface MessageListProps {
  messages: ChatMessage[]
}

interface MessageWrapperProps {
  message: ChatMessage
  isLastMessage: boolean
}

interface ReferenceProps {
  references: ReferenceData[]
}

interface ReferenceItemProps {
  reference: Reference
}

const ReferenceItem: FC<ReferenceItemProps> = ({ reference }) => (
  <div className="relative flex h-[63px] w-[190px] cursor-default flex-col justify-between overflow-hidden rounded-md bg-background-secondary p-3 transition-colors hover:bg-background-secondary/80">
    <p className="text-sm font-medium text-primary">{reference.name}</p>
    <p className="truncate text-xs text-primary/40">{reference.content}</p>
  </div>
)

const References: FC<ReferenceProps> = ({ references }) => (
  <div className="flex flex-col gap-4">
    {references.map((referenceData, index) => (
      <div
        key={`${referenceData.query}-${index}`}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap gap-3">
          {referenceData.references.map((reference, refIndex) => (
            <ReferenceItem
              key={`${reference.name}-${reference.meta_data.chunk}-${refIndex}`}
              reference={reference}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)

export const AgentMessageWrapper = ({ message, isLastMessage }: MessageWrapperProps) => {
  return (
    <div className="flex flex-col gap-y-9">
      {message.extra_data?.reasoning_steps &&
        message.extra_data.reasoning_steps.length > 0 && (
          <div className="flex items-start gap-4">
            <Tooltip
              delayDuration={0}
              content={<p className="text-accent">Reasoning</p>}
              side="top"
            >
              <Icon type="reasoning" size="sm" />
            </Tooltip>
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase">Reasoning</p>
              <Reasonings reasoning={message.extra_data.reasoning_steps} />
            </div>
          </div>
        )}
      {message.extra_data?.references &&
        message.extra_data.references.length > 0 && (
          <div className="flex items-start gap-4">
            <Tooltip
              delayDuration={0}
              content={<p className="text-accent">References</p>}
              side="top"
            >
              <Icon type="references" size="sm" />
            </Tooltip>
            <div className="flex flex-col gap-3">
              <References references={message.extra_data.references} />
            </div>
          </div>
        )}
      {message.tool_calls && message.tool_calls.length > 0 && (
        <div className="flex items-start gap-3">
          <Tooltip
            delayDuration={0}
            content={<p className="text-accent">Tool Calls</p>}
            side="top"
          >
            <Icon
              type="hammer"
              className="rounded-lg bg-background-secondary p-1"
              size="sm"
              color="secondary"
            />
          </Tooltip>

          <div className="flex flex-col gap-2 w-full overflow-hidden">
            {message.tool_calls.map((toolCall, index) => (
              <ToolComponent
                key={
                  toolCall.tool_call_id ||
                  `${toolCall.tool_name}-${toolCall.created_at}-${index}`
                }
                tools={toolCall}
              />
            ))}
            {hasMetadata(message) && (
              <MetadataButton metadata={message.metadata} />
            )}
          </div>
        </div>
      )}
      <AgentMessage message={message} isLastMessage={isLastMessage} />
    </div>
  )
}
const Reasoning: FC<ReasoningStepProps> = ({ index, stepTitle }) => (
  <div className="relative flex items-start gap-4 pb-5 last:pb-1 group">
    {/* Timeline Line */}
    <div className="absolute left-[7px] top-[22px] bottom-0 w-[1px] bg-white/[0.08] group-last:hidden" />
    
    {/* Timeline Dot */}
    <div className="relative mt-1.5 flex flex-col items-center">
      <div className="z-10 h-[15px] w-[15px] rounded-full border-2 border-cyan-400/20 bg-[#03060d] flex items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
      </div>
    </div>

    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">Thought {index + 1}</span>
      <p className="text-[13px] text-slate-300 font-medium leading-relaxed">{stepTitle}</p>
    </div>
  </div>
)
const Reasonings: FC<ReasoningProps> = ({ reasoning }) => (
  <div className="flex flex-col items-start w-full pr-4">
    {reasoning.map((title, index) => (
      <Reasoning
        key={`${title.title}-${title.action}-${index}`}
        stepTitle={title.title || ('content' in title ? String(title.content) : '')}
        index={index}
      />
    ))}
  </div>
)

const ToolComponent = memo(({ tools }: ToolCallProps) => {
  const setSelectedToolCall = useStore((state) => state.setSelectedToolCall);
  const messages = useStore((state) => state.messages);
  const selectedToolCall = useStore((state) => state.selectedToolCall);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [typedStreamingText, setTypedStreamingText] = React.useState('');

  const isSelected = selectedToolCall?.tool_call_id === tools.tool_call_id;
  const isError = tools.tool_call_error;

  const sessionBlock = React.useMemo(() => {
    for (const message of messages) {
      if (message.role !== 'agent' || !message.tool_sessions) continue
      const matched = message.tool_sessions.find(
        (s) => s.tool_call_id === tools.tool_call_id || s.id === (tools.tool_call_id || `${tools.tool_name}-${tools.created_at}`)
      )
      if (matched) return matched
    }
    return null
  }, [messages, tools.tool_call_id, tools.tool_name, tools.created_at])

  const sessionStatus = sessionBlock?.status;
  const resultPayload = tools.result ?? tools.content ?? null
  const isRunning = sessionStatus === 'running' || (!tools.tool_call_error && !resultPayload && tools.metrics?.time === undefined);
  const isCompleted = sessionStatus === 'completed' || (!!resultPayload && !tools.tool_call_error);

  React.useEffect(() => {
    const target = sessionBlock?.streaming_text ?? ''
    if (!target) {
      setTypedStreamingText('')
      return
    }
    if (target.length <= typedStreamingText.length) {
      if (target !== typedStreamingText) setTypedStreamingText(target)
      return
    }

    let raf: number | null = null
    let index = typedStreamingText.length
    const step = () => {
      index = Math.min(target.length, index + 2)
      setTypedStreamingText(target.slice(0, index))
      if (index < target.length) {
        raf = requestAnimationFrame(step)
      }
    }
    raf = requestAnimationFrame(step)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [sessionBlock?.streaming_text, typedStreamingText])

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const formatJSON = (data: unknown) => {
    try {
      if (!data) return ''
      if (typeof data === 'string') {
        const parsed = JSON.parse(data)
        return JSON.stringify(parsed, null, 2)
      }
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  return (
    <div className={`flex flex-col gap-2 rounded-xl border transition-all duration-200 overflow-hidden ${
      isRunning
        ? 'border-cyan-400/50 bg-cyan-950/20 tool-card-running'
        : isError
          ? 'border-red-400/30 bg-red-950/10'
          : isSelected
            ? 'border-cyan-400/30 bg-[linear-gradient(180deg,rgba(11,18,32,0.86),rgba(8,13,24,0.82))]'
            : 'border-white/[0.08] bg-black/20 hover:border-white/[0.15]'
    }`}>
      <div
        onClick={() => {
          setSelectedToolCall(tools);
          toggleExpand();
        }}
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
      >
        <Icon type="hammer" size="sm" className={isRunning ? 'text-cyan-400 animate-pulse' : isError ? 'text-red-400' : 'text-slate-400'} />
        <span className="font-mono text-[13px] tracking-tight text-slate-200">
          {tools.tool_name}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {isError && (
            <span className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Error</span>
          )}
          {tools.metrics?.time !== undefined && (
            <span className="text-slate-500 text-[11px] font-mono">{tools.metrics.time.toFixed(1)}s</span>
          )}
          {isCompleted && (
            <span className="text-emerald-400 text-[11px] flex items-center gap-1.5">
              <Icon type="check" size="sm" />
              <span className="uppercase tracking-wider font-semibold">done</span>
            </span>
          )}
          {isRunning && (
            <span className="text-cyan-400 text-[11px] uppercase tracking-wider font-semibold animate-pulse">Running...</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-3 px-4 pb-4 border-t border-white/[0.05] pt-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Arguments</span>
            <pre className="rounded-[14px] border border-white/[0.08] bg-slate-950/80 p-3 text-[11px] leading-5 text-slate-300 overflow-x-auto font-mono max-h-[200px]">
              {formatJSON(tools.tool_args)}
            </pre>
          </div>
          {resultPayload && (
            <div className="space-y-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
                {isError ? 'Error' : 'Result'}
              </span>
              <pre className={`rounded-[14px] border p-3 text-[11px] leading-5 overflow-x-auto whitespace-pre-wrap font-mono max-h-[300px] ${
                isError
                  ? 'border-red-500/20 bg-red-950/20 text-red-200'
                  : 'border-emerald-500/20 bg-emerald-950/20 text-emerald-200'
              }`}>
                {formatJSON(resultPayload)}
              </pre>
            </div>
          )}
          {sessionBlock?.streaming_text && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Live Content</span>
              <pre className="rounded-[14px] border border-cyan-400/20 bg-cyan-950/20 p-3 text-[11px] leading-5 overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] font-mono max-h-[260px] text-cyan-100">
                {typedStreamingText}
                {sessionBlock.status === 'running' ? <span className="animate-pulse text-cyan-300"> ▋</span> : null}
              </pre>
            </div>
          )}
          {sessionBlock?.parsed_metadata?.event && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metadata</span>
              <div className="rounded-[14px] border border-white/[0.08] bg-slate-950/60 p-3 text-[11px] text-slate-300 space-y-1">
                <div>event: <span className="text-cyan-300">{sessionBlock.parsed_metadata.event}</span></div>
                {sessionBlock.parsed_metadata.model ? <div>model: <span className="text-slate-100">{sessionBlock.parsed_metadata.model}</span></div> : null}
                {sessionBlock.parsed_metadata.token_usage?.total_tokens ? (
                  <div>tokens: <span className="text-slate-100">{sessionBlock.parsed_metadata.token_usage.total_tokens}</span></div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
ToolComponent.displayName = 'ToolComponent'

const MetadataButton = memo(({ metadata }: { metadata: Record<string, unknown> }) => {
  const setSelectedMetadata = useStore((state) => state.setSelectedMetadata);
  const selectedMetadata = useStore((state) => state.selectedMetadata);
  const isSelected = selectedMetadata === metadata;

  return (
    <button
      onClick={() => setSelectedMetadata(metadata)}
      className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-mono lowercase transition-all duration-200 select-none cursor-pointer ${
        isSelected
          ? 'bg-primary/10 border-primary/30 text-primary shadow-sm ring-1 ring-ring/50 focus:outline-none'
          : 'bg-background-secondary/30 border-dashed border-border/50 text-muted-foreground hover:bg-accent/40 hover:text-primary/90 hover:border-solid hover:border-border'
      }`}
    >
      <span className="tracking-tight">⚙️ metadata</span>
    </button>
  )
})
MetadataButton.displayName = 'MetadataButton'

function hasMetadata(message: ChatMessage): message is ChatMessage & { metadata: Record<string, unknown> } {
  return 'metadata' in message && 
         message.metadata !== null && 
         typeof message.metadata === 'object' &&
         !Array.isArray(message.metadata) &&
         Object.keys(message.metadata).length > 0
}

const Messages = ({ messages }: MessageListProps) => {
  if (messages.length === 0) {
    return <ChatBlankState />
  }

  return (
    <>
      {messages.map((message, index) => {
        const key = `${message.role}-${message.created_at}-${index}`
        const isLastMessage = index === messages.length - 1

        if (message.role === 'agent') {
          return (
            <AgentMessageWrapper
              key={key}
              message={message}
              isLastMessage={isLastMessage}
            />
          )
        }
        return <UserMessage key={key} message={message} isLastMessage={isLastMessage} />
      })}
    </>
  )
}

export default Messages
