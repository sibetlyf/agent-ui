import { useStore } from '@/store'
import Icon from '@/components/ui/icon'
import Tooltip from '@/components/ui/tooltip'
import React from 'react'

const RightSidebar = () => {
  const selectedToolCall = useStore((state) => state.selectedToolCall)
  const selectedMetadata = useStore((state) => state.selectedMetadata)
  const setSelectedToolCall = useStore((state) => state.setSelectedToolCall)
  const setSelectedMetadata = useStore((state) => state.setSelectedMetadata)

  if (!selectedToolCall && !selectedMetadata) return null

  const handleClose = () => {
    setSelectedToolCall(null)
    setSelectedMetadata(null)
  }

  const formatJSON = (data: any) => {
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
    <div className="flex h-full w-[400px] flex-col border-l border-border/50 bg-background-secondary/20 font-geist">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-background">
        <h2 className="text-sm font-semibold tracking-tight text-primary flex items-center gap-2">
          <Icon type="hammer" size="sm" className="opacity-70" />
          Inspector
        </h2>
        <button
          onClick={handleClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-primary transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {selectedToolCall && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent/60 px-3 py-1 font-dmmono text-xs uppercase text-primary/90">
                  {selectedToolCall.tool_name}
                </div>
                {selectedToolCall.tool_call_error && (
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">Error</span>
                )}
                {selectedToolCall.metrics?.time !== undefined && (
                  <span className="ml-auto text-xs text-muted-foreground/60 font-mono">
                    {selectedToolCall.metrics.time.toFixed(2)}s
                  </span>
                )}
              </div>
              
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Arguments</span>
                <pre className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-foreground/80 overflow-x-auto font-mono">
                  {formatJSON(selectedToolCall.tool_args)}
                </pre>
              </div>

              {selectedToolCall.content && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Result</span>
                  <pre className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-foreground/80 overflow-x-auto whitespace-pre-wrap font-mono">
                    {formatJSON(selectedToolCall.content)}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {selectedMetadata && Object.keys(selectedMetadata).length > 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider flex items-center gap-2">
                Metadata
              </span>
              <pre className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-foreground/80 overflow-x-auto font-mono">
                {formatJSON(selectedMetadata)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RightSidebar
