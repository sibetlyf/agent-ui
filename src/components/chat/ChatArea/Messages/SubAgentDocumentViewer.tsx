'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/ui/icon'
import { SubAgentDocument } from '@/types/os'
import { MarkdownRenderer } from './MessageItem'

interface SubAgentDocumentViewerProps {
  doc: SubAgentDocument
}

const SubAgentDocumentViewer: React.FC<SubAgentDocumentViewerProps> = ({ doc }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="group my-2 w-full rounded-[20px] border border-white/[0.08] bg-white/[0.02] transition-all hover:bg-white/[0.04] overflow-hidden">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-400/30 transition-all">
          <Icon type="agent" size="sm" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-200">{doc.agent_name}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold bg-white/5 px-1.5 py-0.5 rounded">SubAgent</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {doc.content.substring(0, 60).replace(/\n/g, ' ')}{doc.content.length > 60 ? '...' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {doc.tool_calls && doc.tool_calls.length > 0 && (
            <span className="text-[10px] text-cyan-400/80 font-mono flex items-center gap-1">
              <Icon type="hammer" size="xs" /> {doc.tool_calls.length}
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="px-5 pb-5 pt-1 border-t border-white/[0.05]">
              <div className="mt-4 prose prose-invert prose-sm max-w-none text-slate-300">
                <MarkdownRenderer>
                  {doc.content}
                </MarkdownRenderer>
              </div>

              {doc.tool_calls && doc.tool_calls.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">SubAgent Tools</p>
                  <div className="flex flex-col gap-2">
                    {doc.tool_calls.map((tc, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                        <Icon type="hammer" size="xs" className="text-slate-500" />
                        <span className="font-mono text-[11px] text-slate-300">{tc.tool_name}</span>
                        {tc.metrics?.time !== undefined && (
                           <span className="ml-auto text-[10px] text-slate-600 font-mono">{tc.metrics.time.toFixed(1)}s</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SubAgentDocumentViewer
