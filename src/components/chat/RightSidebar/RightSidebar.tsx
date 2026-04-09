'use client'

import { useStore } from '@/store'
import Icon from '@/components/ui/icon'
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SessionEvent {
  type: 'tool' | 'thought' | 'document'
  title: string
  time?: number
  status?: string
}

const RightSidebar = () => {
  const selectedToolCall = useStore((state) => state.selectedToolCall)
  const selectedMetadata = useStore((state) => state.selectedMetadata)
  const setSelectedToolCall = useStore((state) => state.setSelectedToolCall)
  const setSelectedMetadata = useStore((state) => state.setSelectedMetadata)
  const messages = useStore((state) => state.messages)
  const isStreaming = useStore((state) => state.isStreaming)
  const runContext = useStore((state) => state.runContext)

  const sessionEvents = React.useMemo(() => {
    const events: SessionEvent[] = []
    messages.forEach(msg => {
      if (msg.role === 'agent') {
        if (msg.extra_data?.reasoning_steps) {
          msg.extra_data.reasoning_steps.forEach(step => events.push({ type: 'thought', title: step.title }))
        }
        if (msg.tool_sessions && msg.tool_sessions.length > 0) {
          msg.tool_sessions.forEach(ts => events.push({
            type: 'tool',
            title: ts.tool_name,
            time: ts.metrics_time,
            status: ts.status
          }))
        } else if (msg.tool_calls) {
          msg.tool_calls.forEach(tc => events.push({
            type: 'tool',
            title: tc.tool_name,
            time: tc.metrics?.time,
            status: tc.result || tc.content ? 'done' : tc.tool_call_error ? 'failed' : 'running'
          }))
        }
        if (msg.sub_messages) {
          msg.sub_messages.forEach(sm => events.push({ type: 'document', title: `SubAgent: ${sm.agent_name}` }))
        }
      }
    })
    return events
  }, [messages])

  const totalToolTime = React.useMemo(() => {
    return sessionEvents
      .filter(e => e.type === 'tool' && e.time !== undefined)
      .reduce((sum, e) => sum + (e.time || 0), 0)
  }, [sessionEvents])

  if (!selectedToolCall && !selectedMetadata) return null

  const handleClose = () => {
    setSelectedToolCall(null)
    setSelectedMetadata(null)
  }

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
    <div className="flex h-full w-[400px] flex-col panel-glass font-geist z-50">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 bg-[rgba(7,10,18,0.98)]">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100 flex items-center gap-2">
          <div className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          Inspector
        </h2>
        <button
          onClick={handleClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-white transition-all"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
        </button>
      </div>

      <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden w-full">
        <TabsList className="flex w-full justify-start rounded-none border-b border-white/[0.08] bg-transparent p-0 pl-4 space-x-6">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent px-2 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="rounded-none border-b-2 border-transparent px-2 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value="raw"
            className="rounded-none border-b-2 border-transparent px-2 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Raw
          </TabsTrigger>
          <TabsTrigger
            value="context"
            className="rounded-none border-b-2 border-transparent px-2 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Context
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <TabsContent value="overview" className="m-0 p-5 outline-none space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Events</span>
                  <div className="mt-1 text-2xl font-semibold text-slate-100">{sessionEvents.length}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Latency</span>
                  <div className="mt-1 text-2xl font-semibold text-cyan-400">{totalToolTime.toFixed(1)}s</div>
                </div>
              </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Session Context</h4>
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className={isStreaming ? "text-cyan-400 animate-pulse font-medium" : "text-emerald-400 font-medium"}>
                      {isStreaming ? 'STREAMING' : 'IDLE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Thoughts</span>
                    <span className="text-slate-200">{sessionEvents.filter(e => e.type === 'thought').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Tools</span>
                    <span className="text-slate-200">{sessionEvents.filter(e => e.type === 'tool').length}</span>
                  </div>
                </div>
                </div>

               {selectedToolCall && (() => {
                 const matchedSession = messages
                   .filter((m) => m.role === 'agent' && m.tool_sessions)
                   .flatMap((m) => m.tool_sessions || [])
                   .find((s) => s.tool_call_id === selectedToolCall.tool_call_id || s.id === (selectedToolCall.tool_call_id || `${selectedToolCall.tool_name}-${selectedToolCall.created_at}`))

                 if (!matchedSession) return null

                 return (
                   <div className="space-y-3 pt-2">
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Parsed Metadata</h4>
                     <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-slate-400">Tool Session</span>
                         <span className="text-slate-200 font-mono text-xs">{matchedSession.id}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-slate-400">Status</span>
                         <span className={matchedSession.status === 'running' ? 'text-cyan-400' : matchedSession.status === 'error' ? 'text-red-400' : 'text-emerald-400'}>{matchedSession.status.toUpperCase()}</span>
                       </div>
                       {matchedSession.parsed_metadata?.event ? (
                         <div className="flex justify-between">
                           <span className="text-slate-400">Event</span>
                           <span className="text-cyan-300">{matchedSession.parsed_metadata.event}</span>
                         </div>
                       ) : null}
                       {matchedSession.parsed_metadata?.token_usage?.total_tokens ? (
                         <div className="flex justify-between">
                           <span className="text-slate-400">Tokens</span>
                           <span className="text-slate-200">{matchedSession.parsed_metadata.token_usage.total_tokens}</span>
                         </div>
                       ) : null}
                     </div>
                   </div>
                 )
               })()}

               {selectedToolCall && (
                  <div className="space-y-3 pt-2">
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Selected Focus</h4>
                   <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                     <div className="flex items-center gap-2 mb-2">
                       <Icon type="hammer" size="xs" className="text-cyan-400" />
                       <span className="text-xs font-bold text-slate-200">{selectedToolCall.tool_name}</span>
                     </div>
                     <p className="text-[11px] text-slate-400 leading-relaxed">
                       Currently inspecting active tool execution details in the Raw tab.
                     </p>
                   </div>
                 </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="m-0 p-5 outline-none">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Execution Stream</h4>
                  <span className="text-[10px] font-mono text-slate-600">LIVE RELAY</span>
                </div>
                
                <div className="relative pl-4 space-y-6">
                  <div className="absolute left-[-1px] top-2 bottom-2 w-[1px] bg-white/[0.08]" />
                  
                  {sessionEvents.length === 0 ? (
                    <div className="text-center py-10 text-slate-600 italic text-sm">No events recorded.</div>
                  ) : (
                    sessionEvents.map((event, idx) => (
                      <div key={idx} className="relative group">
                        <div className={`absolute left-[-21px] top-1.5 h-3 w-3 rounded-full border-2 border-background z-10 ${
                          event.type === 'tool' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' :
                          event.type === 'thought' ? 'bg-slate-700' : 'bg-amber-400'
                        }`} />
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{event.type}</span>
                            {event.time && <span className="text-[10px] font-mono text-slate-600">{event.time.toFixed(1)}s</span>}
                          </div>
                          <p className="text-[13px] text-slate-400 group-hover:text-slate-200 transition-colors truncate">{event.title}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="raw" className="m-0 p-5 outline-none space-y-6">
              {selectedToolCall && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-3 py-1 font-mono text-[10px] uppercase text-cyan-300 tracking-wider">
                      {selectedToolCall.tool_name}
                    </div>
                    {selectedToolCall.tool_call_error && (
                      <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-400 uppercase">Error</span>
                    )}
                    {selectedToolCall.metrics?.time !== undefined && (
                      <span className="ml-auto text-[11px] text-slate-500 font-mono">
                        {selectedToolCall.metrics.time.toFixed(2)}s
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Arguments</span>
                    <pre className="rounded-2xl border border-white/[0.05] bg-black/40 p-4 text-[11px] leading-5 text-slate-300 overflow-x-auto font-mono custom-scrollbar">
                      {formatJSON(selectedToolCall.tool_args)}
                    </pre>
                  </div>

                  {(selectedToolCall.result || selectedToolCall.content) && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Result</span>
                      <pre className="rounded-2xl border border-white/[0.05] bg-black/40 p-4 text-[11px] leading-5 text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono custom-scrollbar max-h-[400px]">
                        {formatJSON(selectedToolCall.result || selectedToolCall.content)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {selectedMetadata && Object.keys(selectedMetadata).length > 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 pl-1">
                      Metadata Parameters
                    </span>
                    <pre className="rounded-2xl border border-white/[0.05] bg-black/40 p-4 text-[11px] leading-5 text-slate-300 overflow-x-auto font-mono custom-scrollbar">
                      {formatJSON(selectedMetadata)}
                    </pre>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="context" className="m-0 p-5 outline-none space-y-5">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Environment Chain</h4>
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-slate-500 uppercase tracking-wider">USERSPACE</div>
                    <div className="font-mono text-slate-300 break-all">{runContext?.userspace || 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500 uppercase tracking-wider">SESSIONSPACE</div>
                    <div className="font-mono text-slate-300 break-all">{runContext?.sessionspace || 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500 uppercase tracking-wider">WORKSPACE</div>
                    <div className="font-mono text-cyan-300 break-all">{runContext?.workspace || 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500 uppercase tracking-wider">RUNSPACE</div>
                    <div className="font-mono text-slate-300 break-all">{runContext?.runspace || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Runtime IDs</h4>
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider">USER_ID</div>
                    <div className="font-mono text-slate-300 truncate">{runContext?.user_id || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider">RECORD_ID</div>
                    <div className="font-mono text-slate-300 truncate">{runContext?.record_id || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider">SESSION_ID</div>
                    <div className="font-mono text-cyan-300 truncate">{runContext?.session_id || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider">RUN_ID</div>
                    <div className="font-mono text-cyan-300 truncate">{runContext?.run_id || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {runContext?.vibe_record_ids && runContext.vibe_record_ids.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vibe Record IDs</h4>
                  <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 flex flex-wrap gap-2">
                    {runContext.vibe_record_ids.map((rid) => (
                      <span key={rid} className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-mono text-cyan-300">{rid}</span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  )
}

export default RightSidebar
