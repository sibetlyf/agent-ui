'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { useQueryState } from 'nuqs'

const ChatInput = () => {
  const { chatInputRef } = useStore()

  const { handleStreamResponse, stopStreaming } = useAIChatStreamHandler()
  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [inputMessage, setInputMessage] = useState('')
  const isStreaming = useStore((state) => state.isStreaming)

  const charCount = inputMessage.length

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return

    const currentMessage = inputMessage
    setInputMessage('')

    try {
      await handleStreamResponse(currentMessage)
    } catch (error) {
      toast.error(
        `Error in handleSubmit: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  return (
    <div className="relative mx-auto mb-4 flex w-full max-w-3xl flex-col items-end gap-x-2 font-geist">
      <div className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,32,0.4),rgba(8,13,24,0.4))] backdrop-blur-xl transition-all hover:border-white/20 focus-within:border-cyan-400/40 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.1)]">
        <Textarea
          placeholder={'问点什么...'}
          value={inputMessage}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputMessage(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              !e.shiftKey &&
              !isStreaming
            ) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          className="min-h-[56px] max-h-[200px] w-full resize-none border-none bg-transparent px-5 py-4 text-[15px] text-slate-200 placeholder:text-slate-500 focus:ring-0"
          disabled={!(selectedAgent || teamId)}
          ref={chatInputRef as React.RefObject<HTMLTextAreaElement>}
        />
        
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-4 pl-1">
             <span className={`text-[10px] font-mono tracking-widest ${charCount > 1000 ? 'text-amber-400' : 'text-slate-500'}`}>
              {charCount} CHARS
             </span>
          </div>

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Button
                onClick={stopStreaming}
                variant="destructive"
                size="sm"
                className="h-8 rounded-full px-4 text-[11px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <div className="mr-2 h-2 w-2 rounded-sm bg-white animate-pulse" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!(selectedAgent || teamId) || !inputMessage.trim()}
                size="icon"
                className="h-9 w-9 rounded-full bg-cyan-400 p-0 text-black hover:bg-cyan-300 hover:scale-105 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
