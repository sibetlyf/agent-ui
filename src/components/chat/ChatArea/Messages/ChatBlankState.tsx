'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/ui/icon'
import React, { useState } from 'react'
import { useStore } from '@/store'
import { useQueryState } from 'nuqs'

const ChatBlankState = () => {
  const selectedEndpoint = useStore(state => state.selectedEndpoint)
  const isEndpointActive = useStore(state => state.isEndpointActive)
  const agents = useStore(state => state.agents)
  const [, setSelectedAgentId] = useQueryState('agent')
  const [selectedAgentShowcase, setSelectedAgentShowcase] = useState<string | null>(null)

  const particles = Array.from({ length: 30 }).map(() => ({
    width: Math.random() * 4 + 1 + 'px',
    height: Math.random() * 4 + 1 + 'px',
    left: Math.random() * 100 + '%',
    top: Math.random() * 100 + '%',
    animationDuration: Math.random() * 5 + 3 + 's',
    animationDelay: Math.random() * 5 + 's',
  }))

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId)
  }

  const handleShowAgentInfo = (agentId: string) => {
    setSelectedAgentShowcase(agentId === selectedAgentShowcase ? null : agentId)
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center p-8 font-geist min-h-[60vh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-screen">
        {particles.map((style, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-400 opacity-0 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"
            style={style}
          />
        ))}
      </div>

      <div className="z-10 flex max-w-3xl flex-col items-center gap-y-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-5"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(7,10,18,0.98),rgba(3,6,12,0.98))] shadow-[0_0_40px_rgba(34,211,238,0.15)]">
            <Icon type="agent" size="lg" className="text-cyan-400" />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white drop-shadow-sm">
            与您的智能体对话
          </h1>
          <p className="max-w-[400px] text-[15px] leading-relaxed text-slate-400">
            连接至 <span className="font-mono text-cyan-300 px-1 py-0.5 rounded bg-cyan-950/30">{selectedEndpoint || 'Local Node'}</span>
            <br />
            {isEndpointActive ? (
              <span className="text-emerald-400 flex items-center justify-center gap-1.5 mt-2 text-xs uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> Gateway Connected</span>
            ) : (
              <span className="text-slate-500 flex items-center justify-center gap-1.5 mt-2 text-xs uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> System Offline</span>
            )}
          </p>
        </motion.div>

        {agents && agents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-xl"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-4 font-semibold text-center mt-6">选择您的智能代理</p>
            <div className="grid grid-cols-2 gap-3">
              {agents.slice(0, 4).map((agent) => (
                <div key={agent.id}>
                  <button
                    onClick={() => handleShowAgentInfo(agent.id)}
                    className={`group w-full flex flex-col items-start gap-2 rounded-[20px] border p-4 text-left transition-all ${
                      selectedAgentShowcase === agent.id
                        ? 'border-cyan-400/40 bg-[linear-gradient(180deg,rgba(11,18,32,0.8),rgba(8,13,24,0.8))] shadow-[0_8px_30px_rgba(34,211,238,0.15)]'
                        : 'border-white/[0.08] bg-[linear-gradient(180deg,rgba(11,18,32,0.4),rgba(8,13,24,0.4))] hover:bg-[linear-gradient(180deg,rgba(11,18,32,0.7),rgba(8,13,24,0.7))] hover:border-cyan-400/30 hover:shadow-[0_8px_30px_rgba(34,211,238,0.1)]'
                    } focus:outline-none`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={`font-display text-[15px] font-medium transition-colors ${
                        selectedAgentShowcase === agent.id ? 'text-cyan-400' : 'text-slate-200 group-hover:text-cyan-400'
                      }`}>
                        {agent.name || agent.id}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`opacity-0 -translate-x-2 transition-all ${
                        selectedAgentShowcase === agent.id ? 'opacity-100 translate-x-0 rotate-180' : 'group-hover:opacity-100 group-hover:translate-x-0'
                      } text-cyan-400`}><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                    <span className="text-xs text-slate-500">
                      {agent.model?.provider && agent.model?.model
                        ? `${agent.model.provider} · ${agent.model.model}`
                        : agent.model?.provider
                          ? `${agent.model.provider} Model`
                          : 'Agent Framework'
                      }
                    </span>
                  </button>

                  <AnimatePresence>
                    {selectedAgentShowcase === agent.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-[16px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(11,18,32,0.6),rgba(8,13,24,0.6))] p-4 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Icon type="agent" size="xs" />
                            <span className="font-mono">{agent.model?.name || agent.model?.model || 'AI Agent'}</span>
                            {agent.db_id && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                  Persisted
                                </span>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => handleSelectAgent(agent.id)}
                            className="w-full mt-2 h-9 rounded-full bg-cyan-400 text-[11px] font-bold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 transition-colors shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                          >
                            开始对话
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ChatBlankState
