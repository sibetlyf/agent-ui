'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/ui/icon'
import { SubAgentDocument } from '@/types/os'
import { MarkdownRenderer } from './MessageItem'
import { useStore } from '@/store'

interface SubAgentDocumentViewerProps {
  doc: SubAgentDocument
}

type RunEntry = {
  name: string
  path: string
  is_dir: boolean
  updated_at: number
  size: number
}

type FeedEntry = {
  id: string
  kind: 'status' | 'tool' | 'artifact'
  text: string
  ts?: number
}

type SubTab = 'overview' | 'artifacts' | 'logs' | 'raw'
type FeedFilter = 'all' | 'status' | 'tool' | 'artifact'

const formatRelativeTime = (unixSec?: number) => {
  if (!unixSec) return 'unknown'
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSec)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const formatSize = (size: number, isDir: boolean) => {
  if (isDir) return 'DIR'
  if (size <= 0) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const feedGroup = (ts?: number) => {
  if (!ts) return 'No timestamp'
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts)
  if (diff < 60) return 'Now'
  if (diff < 3600) return 'Last hour'
  if (diff < 86400) return 'Today'
  return 'Earlier'
}

const SubAgentDocumentViewerComponent: React.FC<SubAgentDocumentViewerProps> = ({ doc }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<SubTab>('overview')
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [recentFeedIds, setRecentFeedIds] = useState<Set<string>>(new Set())
  const previousFeedIdsRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(true)
  const setSelectedMetadata = useStore((state) => state.setSelectedMetadata)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const metadata = (doc.metadata ?? {}) as Record<string, unknown>
  const artifactPath = typeof metadata.__artifact_path === 'string' ? metadata.__artifact_path : undefined
  const updatedAt = typeof metadata.__updated_at === 'number' ? metadata.__updated_at : undefined
  const runs = useMemo(() => {
    const raw = metadata.__runs
    if (!Array.isArray(raw)) return [] as RunEntry[]
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const obj = item as Record<string, unknown>
        if (typeof obj.path !== 'string' || typeof obj.name !== 'string') return null
        return {
          name: obj.name,
          path: obj.path,
          is_dir: obj.is_dir === true,
          updated_at: typeof obj.updated_at === 'number' ? obj.updated_at : Math.floor(Date.now() / 1000),
          size: typeof obj.size === 'number' ? obj.size : 0
        }
      })
      .filter((v): v is RunEntry => v !== null)
      .sort((a, b) => b.updated_at - a.updated_at)
  }, [metadata.__runs])

  const hasError = !!doc.tool_calls?.some((tc) => tc.tool_call_error)
  const hasRunningTools = !!doc.tool_calls?.some((tc) => !tc.tool_call_error && !tc.result && !tc.content)
  const isFresh = typeof updatedAt === 'number' && Math.abs(Math.floor(Date.now() / 1000) - updatedAt) <= 14
  const status: 'running' | 'idle' | 'error' = hasError ? 'error' : hasRunningTools || isFresh ? 'running' : 'idle'

  const agentKey = useMemo(() => doc.agent_name.trim().toLowerCase().replace(/\s+/g, '-'), [doc.agent_name])
  const filteredRuns = useMemo(() => {
    const matched = runs.filter((r) => {
      const lowerName = r.name.toLowerCase()
      const lowerPath = r.path.toLowerCase()
      return lowerName.includes(agentKey) || lowerPath.includes(agentKey)
    })
    return matched.length > 0 ? matched : runs
  }, [runs, agentKey])

  const feedEntries = useMemo(() => {
    const out: FeedEntry[] = [
      {
        id: `status-${status}`,
        kind: 'status',
        text:
          status === 'running'
            ? 'Subagent is actively updating'
            : status === 'error'
              ? 'Subagent reported an error'
              : 'Subagent is idle',
        ts: updatedAt
      }
    ]

    if (artifactPath) {
      out.push({ id: `artifact-${artifactPath}`, kind: 'artifact', text: `Artifact synced: ${artifactPath}`, ts: updatedAt })
    }

    ;(doc.tool_calls ?? []).forEach((tc, idx) => {
      const state = tc.tool_call_error ? 'failed' : tc.result || tc.content ? 'completed' : 'running'
      out.push({
        id: `tool-${idx}-${tc.tool_call_id}`,
        kind: 'tool',
        text: `${tc.tool_name} · ${state}`,
        ts: tc.created_at
      })
    })

    if (filteredRuns.length > 0) {
      out.push({ id: `runs-${filteredRuns.length}`, kind: 'artifact', text: `Runs detected: ${filteredRuns.length}`, ts: filteredRuns[0]?.updated_at })
    }

    return out.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
  }, [doc.tool_calls, artifactPath, filteredRuns, status, updatedAt])

  useEffect(() => {
    const currentIds = new Set(feedEntries.map((e) => e.id))
    const prevIds = previousFeedIdsRef.current
    const fresh = new Set<string>()
    currentIds.forEach((id) => {
      if (!prevIds.has(id)) fresh.add(id)
    })
    previousFeedIdsRef.current = currentIds
    if (fresh.size > 0) {
      setRecentFeedIds(fresh)
      const t = setTimeout(() => {
        if (mountedRef.current) setRecentFeedIds(new Set())
      }, 2200)
      return () => clearTimeout(t)
    }
  }, [feedEntries])

  const groupedFeed = useMemo(() => {
    const map = new Map<string, FeedEntry[]>()
    for (const item of feedEntries) {
      if (feedFilter !== 'all' && item.kind !== feedFilter) continue
      const label = feedGroup(item.ts)
      map.set(label, [...(map.get(label) ?? []), item])
    }
    return Array.from(map.entries())
  }, [feedEntries, feedFilter])

  const openLocalPath = async (absolutePath: string) => {
    const normalized = absolutePath.replace(/\\/g, '/')
    const url = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const statusClasses =
    status === 'running'
      ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200'
      : status === 'error'
        ? 'border-rose-400/35 bg-rose-400/10 text-rose-200'
        : 'border-white/15 bg-white/[0.03] text-slate-300'

  return (
    <div
      className={`group my-2 w-full rounded-[20px] border transition-all overflow-hidden ${
        status === 'running'
          ? 'border-cyan-400/35 bg-cyan-500/[0.06] shadow-[0_0_18px_rgba(34,211,238,0.22)]'
          : status === 'error'
            ? 'border-rose-400/30 bg-rose-500/[0.05]'
            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <div onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-400/30 transition-all">
          <Icon type="agent" size="sm" />
          {status === 'running' ? <span className="absolute -right-1 -top-1 size-2 rounded-full bg-cyan-300 animate-pulse" /> : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-200 truncate">{doc.agent_name}</span>
            <span className={`text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border ${statusClasses}`}>
              {status}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {doc.content.substring(0, 78).replace(/\n/g, ' ')}
            {doc.content.length > 78 ? '...' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {doc.tool_calls && doc.tool_calls.length > 0 ? (
            <span className="text-[10px] text-cyan-400/80 font-mono flex items-center gap-1">
              <Icon type="hammer" size="xs" /> {doc.tool_calls.length}
            </span>
          ) : null}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={() => { setIsExpanded(true); setActiveTab('logs') }} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-200 hover:border-cyan-300/35 hover:bg-cyan-500/10">Feed</button>
          <button type="button" onClick={() => { setIsExpanded(true); setActiveTab('artifacts') }} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-200 hover:border-cyan-300/35 hover:bg-cyan-500/10">Runs</button>
          <button type="button" onClick={() => { setIsExpanded(true); setActiveTab('overview') }} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-200 hover:border-cyan-300/35 hover:bg-cyan-500/10">Files</button>
          <button
            type="button"
            onClick={() => {
              setSelectedMetadata(metadata)
              setIsExpanded(true)
              setActiveTab('raw')
            }}
            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-200 hover:border-cyan-300/35 hover:bg-cyan-500/10"
          >
            Raw
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <div className="px-5 pb-5 pt-2 border-t border-white/[0.05]">
              <div className="mb-3 flex flex-wrap gap-2">
                {(['overview', 'artifacts', 'logs', 'raw'] as SubTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-2.5 py-1 text-[10px] uppercase tracking-widest border ${
                      activeTab === tab
                        ? 'border-cyan-300/45 bg-cyan-400/12 text-cyan-200'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' ? (
                <div className="space-y-4">
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                    <MarkdownRenderer>{doc.content}</MarkdownRenderer>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-[11px] text-slate-300 space-y-1">
                    <div>Artifact: <span className="font-mono text-cyan-200 break-all">{artifactPath ?? 'N/A'}</span></div>
                    <div>Updated: <span className="font-mono text-slate-200">{formatRelativeTime(updatedAt)}</span></div>
                    <div>Runs: <span className="font-mono text-slate-200">{filteredRuns.length}</span></div>
                  </div>
                </div>
              ) : null}

              {activeTab === 'artifacts' ? (
                <div className="space-y-2">
                  {filteredRuns.length === 0 ? (
                    <div className="text-[11px] text-slate-400">No run artifacts yet.</div>
                  ) : (
                    filteredRuns.map((entry) => (
                      <button
                        key={entry.path}
                        type="button"
                        onClick={() => void openLocalPath(entry.path)}
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left hover:border-cyan-300/35 hover:bg-cyan-500/10"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-slate-200 break-all">{entry.is_dir ? '📁' : '📄'} {entry.name}</span>
                          <span className="text-[10px] text-slate-400">{formatSize(entry.size, entry.is_dir)}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">{formatRelativeTime(entry.updated_at)}</div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {activeTab === 'logs' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'status', 'tool', 'artifact'] as FeedFilter[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFeedFilter(k)}
                        className={`rounded-md px-2 py-1 text-[10px] uppercase tracking-widest border ${
                          feedFilter === k
                            ? 'border-cyan-300/45 bg-cyan-400/12 text-cyan-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  {groupedFeed.map(([label, items]) => (
                    <div key={label} className="space-y-2">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
                      <div className="space-y-3">
                        {items.map((e) => (
                          <div
                            key={e.id}
                            className={`relative pl-5 rounded-md ${recentFeedIds.has(e.id) ? 'bg-amber-300/10 ring-1 ring-amber-300/35 animate-pulse' : ''}`}
                          >
                            <span className={`absolute left-1 top-2 size-2 rounded-full ${e.kind === 'tool' ? 'bg-cyan-300' : e.kind === 'artifact' ? 'bg-amber-300' : status === 'error' ? 'bg-rose-300' : 'bg-emerald-300'} ${status === 'running' ? 'animate-pulse' : ''}`} />
                            <div className="text-[11px] text-slate-200 leading-relaxed">{e.text}</div>
                            {e.ts ? <div className="text-[10px] text-slate-500 font-mono">{formatRelativeTime(e.ts)}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeTab === 'raw' ? (
                <pre className="rounded-2xl border border-white/[0.08] bg-black/45 p-3 text-[11px] leading-5 text-slate-100 overflow-x-auto whitespace-pre-wrap font-mono custom-scrollbar max-h-[360px]">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              ) : null}

              {doc.tool_calls && doc.tool_calls.length > 0 ? (
                <div className="mt-6 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">SubAgent Tools</p>
                  <div className="flex flex-col gap-2">
                    {doc.tool_calls.map((tc, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                        <Icon type="hammer" size="xs" className="text-slate-500" />
                        <span className="font-mono text-[11px] text-slate-300">{tc.tool_name}</span>
                        {tc.metrics?.time !== undefined ? <span className="ml-auto text-[10px] text-slate-600 font-mono">{tc.metrics.time.toFixed(1)}s</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {doc.tool_calls && doc.tool_calls.length > 1 ? (
                <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Workflow Graph</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-cyan-300/35 bg-cyan-400/12 px-2 py-1 text-[10px] text-cyan-200">{doc.agent_name}</span>
                    {doc.tool_calls.map((tc, idx) => (
                      <React.Fragment key={`${tc.tool_name}-${idx}`}>
                        <span className="text-slate-500 text-[10px]">→</span>
                        <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] text-slate-200">{tc.tool_name}</span>
                      </React.Fragment>
                    ))}
                    <span className="text-slate-500 text-[10px]">→</span>
                    <span className="rounded-md border border-amber-300/35 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">artifacts</span>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

const SubAgentDocumentViewer = React.memo(SubAgentDocumentViewerComponent)
SubAgentDocumentViewer.displayName = 'SubAgentDocumentViewer'

export default SubAgentDocumentViewer
