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

export const AgentMessageWrapper = ({ message }: MessageWrapperProps) => {
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
            {(message as any).metadata && Object.keys((message as any).metadata).length > 0 && (
              <MetadataButton metadata={(message as any).metadata} />
            )}
          </div>
        </div>
      )}
      <AgentMessage message={message} />
    </div>
  )
}
const Reasoning: FC<ReasoningStepProps> = ({ index, stepTitle }) => (
  <div className="flex items-center gap-2 text-secondary">
    <div className="flex h-[20px] items-center rounded-md bg-background-secondary p-2">
      <p className="text-xs">STEP {index + 1}</p>
    </div>
    <p className="text-xs">{stepTitle}</p>
  </div>
)
const Reasonings: FC<ReasoningProps> = ({ reasoning }) => (
  <div className="flex flex-col items-start justify-center gap-2">
    {reasoning.map((title, index) => (
      <Reasoning
        key={`${title.title}-${title.action}-${index}`}
        stepTitle={title.title}
        index={index}
      />
    ))}
  </div>
)

const ToolComponent = memo(({ tools }: ToolCallProps) => {
  const setSelectedToolCall = useStore((state) => state.setSelectedToolCall);
  const selectedToolCall = useStore((state) => state.selectedToolCall);
  
  const isSelected = selectedToolCall?.tool_call_id === tools.tool_call_id;

  return (
    <button
      onClick={() => setSelectedToolCall(tools)}
      className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono uppercase transition-all duration-200 select-none cursor-pointer ${
        isSelected 
          ? 'bg-accent border-accent text-primary shadow-sm ring-1 ring-ring/50 focus:outline-none' 
          : 'bg-background-secondary/30 border-border/50 text-muted-foreground hover:bg-accent/40 hover:text-primary/90 hover:border-border'
      }`}
    >
      <span className="tracking-tight">{tools.tool_name}</span>
      {tools.tool_call_error && (
        <span className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-[1px] rounded-full">Error</span>
      )}
      {tools.metrics?.time !== undefined && (
        <span className="opacity-50 text-[10px] tabular-nums">{tools.metrics.time.toFixed(1)}s</span>
      )}
    </button>
  )
})
ToolComponent.displayName = 'ToolComponent'

const MetadataButton = memo(({ metadata }: { metadata: any }) => {
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
        return <UserMessage key={key} message={message} />
      })}
    </>
  )
}

export default Messages
