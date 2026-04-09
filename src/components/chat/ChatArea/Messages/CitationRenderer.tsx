'use client'

import React from 'react'
import Icon from '@/components/ui/icon'
import { CitationData } from '@/types/os'

interface CitationRendererProps {
  citations: CitationData[]
}

const CitationRenderer: React.FC<CitationRendererProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null

  return (
    <div className="mt-6 border-t border-white/[0.05] pt-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon type="references" size="xs" className="text-slate-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sources & Citations</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {citations.map((cite, idx) => (
          <a
            key={cite.source_id || idx}
            href={cite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition-all hover:bg-white/[0.05] hover:border-cyan-400/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyan-400/70">[{idx + 1}]</span>
              {cite.score && (
                <span className="text-[9px] text-slate-600 font-mono">{(cite.score * 100).toFixed(0)}% match</span>
              )}
            </div>
            <h5 className="text-[12px] font-semibold text-slate-300 line-clamp-1 group-hover:text-cyan-400 transition-colors">
              {cite.title || cite.source || 'Source Document'}
            </h5>
            {(cite.snippet || cite.text) && (
              <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                {cite.snippet || cite.text}
              </p>
            )}
            {cite.url && (
              <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-600 font-mono truncate">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                {cite.url.replace(/^https?:\/\//, '')}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}

export default CitationRenderer
