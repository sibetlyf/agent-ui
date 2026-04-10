'use client'

import Icon from '@/components/ui/icon'
import _MarkdownRenderer from '@/components/ui/typography/MarkdownRenderer'
import { useStore } from '@/store'
import type { ChatMessage } from '@/types/os'
import Videos from './Multimedia/Videos'
import Images from './Multimedia/Images'
import Audios from './Multimedia/Audios'
import { memo } from 'react'
import AgentThinkingLoader from './AgentThinkingLoader'
import ProtocolRenderer from './ProtocolRenderer'
import TodoPlanRenderer from './TodoPlanRenderer'
import SubAgentDocumentViewer from './SubAgentDocumentViewer'
import CitationRenderer from './CitationRenderer'

interface MessageProps {
  message: ChatMessage
  isLastMessage?: boolean
}

export const MarkdownRenderer = memo(({ children }: { children: string }) => (
  <div className="Markdown--base">
    <_MarkdownRenderer>{children}</_MarkdownRenderer>
  </div>
))
MarkdownRenderer.displayName = 'MarkdownRenderer'

const StreamingCursor = () => (
  <span className="inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
)

const AgentMessage = ({ message, isLastMessage }: MessageProps) => {
  const { streamingErrorMessage, isStreaming } = useStore()
  let messageContent

  if (message.streamingError) {
    messageContent = (
      <p className="text-destructive">
        Oops! Something went wrong while streaming.{' '}
        {streamingErrorMessage ? (
          <>{streamingErrorMessage}</>
        ) : (
          'Please try refreshing the page or try again later.'
        )}
      </p>
    )
  } else {
    // Determine the main text content
    const textContent = message.content || message.response_audio?.transcript
    const showCursor = isLastMessage && isStreaming && textContent

    messageContent = (
      <div className="flex w-full flex-col gap-4">
        {textContent ? (
          <div className="relative">
            <MarkdownRenderer>{textContent}</MarkdownRenderer>
            {showCursor && <StreamingCursor />}
          </div>
        ) : !message.todo_plan && !message.sub_messages?.length ? (
          <div className="mt-2">
            <AgentThinkingLoader />
          </div>
        ) : null}

        {message.videos && message.videos.length > 0 && (
          <Videos videos={message.videos} />
        )}
        {message.images && message.images.length > 0 && (
          <Images images={message.images} />
        )}
        {(message.audio || message.response_audio) && (
          <Audios audio={[...(message.audio || []), ...(message.response_audio ? [message.response_audio] : [])]} />
        )}
        {message.protocols && message.protocols.length > 0 && (
          <ProtocolRenderer protocols={message.protocols} />
        )}
        {message.sub_messages && message.sub_messages.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {message.sub_messages.map((doc, idx) => (
              <SubAgentDocumentViewer
                key={`${doc.agent_name}-${doc.created_at}-${idx}`}
                doc={doc}
              />
            ))}
          </div>
        )}
        {message.todo_plan && (
          <TodoPlanRenderer plan={message.todo_plan} />
        )}
        {message.citations && message.citations.length > 0 && (
          <CitationRenderer citations={message.citations} />
        )}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-row items-start gap-3 pt-4 font-geist">
      <div className="flex-shrink-0 mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <Icon type="agent" size="sm" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="text-[15px] leading-relaxed text-slate-200 overflow-hidden [overflow-wrap:anywhere]">
          {messageContent}
        </div>
      </div>
    </div>
  )
}

const UserMessage = memo(({ message }: MessageProps) => {
  return (
    <div className="flex w-full items-start justify-end gap-3 pt-6 pb-2">
      <div className="text-[15px] leading-relaxed rounded-[22px] rounded-tr-sm bg-[linear-gradient(180deg,rgba(11,18,32,0.86),rgba(8,13,24,0.82))] border border-white/[0.08] px-5 py-3 font-geist text-slate-200 max-w-[85%] shadow-sm [overflow-wrap:anywhere]">
        {message.content}
      </div>
      <div className="flex-shrink-0 mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Icon type="user" size="sm" className="text-slate-400 opacity-80" />
      </div>
    </div>
  )
})

AgentMessage.displayName = 'AgentMessage'
UserMessage.displayName = 'UserMessage'
export { AgentMessage, UserMessage }
