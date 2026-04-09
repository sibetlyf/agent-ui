'use client'

import React from 'react'
import Icon from '@/components/ui/icon'
import { TodoPlan } from '@/types/os'

interface TodoPlanRendererProps {
  plan: TodoPlan
}

const TodoPlanRenderer: React.FC<TodoPlanRendererProps> = ({ plan }) => {
  const previousStatusRef = React.useRef<Record<string, 'pending' | 'completed' | 'failed'>>({})
  const [changedStepKeys, setChangedStepKeys] = React.useState<Set<string>>(new Set())

  const totalMissions = plan.plans.length
  const completedSteps = plan.plans.reduce(
    (sum, m) => sum + m.steps.filter(s => s.status === 'completed').length,
    0
  )
  const totalSteps = plan.plans.reduce((sum, m) => sum + m.steps.length, 0)

  React.useEffect(() => {
    const changed = new Set<string>()
    const nextStatus: Record<string, 'pending' | 'completed' | 'failed'> = {}

    for (const mission of plan.plans) {
      for (const step of mission.steps) {
        const key = `${mission.mission_id}-${step.step_id}`
        nextStatus[key] = step.status
        const previous = previousStatusRef.current[key]
        if (previous && previous !== step.status) {
          changed.add(key)
        }
      }
    }

    previousStatusRef.current = nextStatus
    setChangedStepKeys(changed)

    if (changed.size > 0) {
      const timer = setTimeout(() => setChangedStepKeys(new Set()), 2200)
      return () => clearTimeout(timer)
    }
  }, [plan])

  return (
    <div className="my-4 w-full rounded-2xl border border-cyan-300/30 bg-[linear-gradient(180deg,rgba(13,21,38,0.95),rgba(7,12,23,0.94))] p-5 shadow-xl font-geist animate-in slide-in-from-top-2 duration-300">
      <div className="mb-6 flex items-start justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-cyan-400/20 text-cyan-200 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Mission Dispatch</span>
            <span className="text-slate-300 text-xs">/ {plan.target}</span>
          </div>
          <h2 className="text-lg font-semibold text-white tracking-tight">{plan.title}</h2>
          <div className="mt-1 text-xs text-slate-300">
            {totalMissions} missions · {completedSteps}/{totalSteps} steps completed
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-200">
          <Icon type="reasoning" size="default" />
        </div>
      </div>

      <div className="space-y-8">
        {plan.plans.map((mission, mIdx) => (
          <div key={mission.mission_id} className="relative pl-6">
            <div className="absolute left-[3px] top-1 bottom-0 w-[2px] bg-gradient-to-b from-cyan-400/40 via-cyan-400/10 to-transparent" />

            <div className="flex items-center gap-3 mb-4">
              <div className="absolute left-0 top-[6px] h-[8px] w-[8px] rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Mission {mIdx + 1}: {mission.title}</h3>
            </div>

            <div className="grid gap-3">
              {mission.steps.map((step, stepIndex) => {
                const stepKey = `${mission.mission_id}-${step.step_id}`
                const isChanged = changedStepKeys.has(stepKey)
                return (
                <div
                  key={step.step_id}
                  className={`relative rounded-xl border p-3 transition-all animate-in fade-in-0 slide-in-from-bottom-1 ${
                    step.status === 'completed'
                      ? 'border-emerald-400/40 bg-emerald-500/12'
                      : step.status === 'failed'
                        ? 'border-rose-400/40 bg-rose-500/12'
                        : step.status === 'pending'
                          ? 'border-cyan-300/50 bg-cyan-500/14 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                          : 'border-white/15 bg-white/[0.04]'
                  } ${isChanged ? 'ring-2 ring-amber-300/70 shadow-[0_0_22px_rgba(251,191,36,0.35)]' : ''}`}
                  style={{ animationDelay: `${stepIndex * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-slate-300 font-mono">STEP {step.step_id}</span>
                        {step.status === 'completed' && <Icon type="check" size="xs" className="text-emerald-300" />}
                        {step.status === 'failed' && <Icon type="x" size="xs" className="text-rose-300" />}
                        {step.status === 'pending' && (
                          <span className="text-[9px] text-cyan-200 uppercase tracking-wider font-semibold animate-pulse">Running</span>
                        )}
                        {isChanged && (
                          <span className="text-[9px] text-amber-200 uppercase tracking-wider font-semibold">Updated</span>
                        )}
                      </div>
                      <h4 className="text-[13px] font-semibold text-white">{step.title}</h4>
                      <p className="mt-1 text-xs text-slate-200 leading-relaxed">{step.content}</p>

                      {step.tools && step.tools.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {step.tools.map(tool => (
                            <span key={tool} className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-[9px] text-slate-100 font-mono">
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {step.status === 'pending' && (
                      <div className="size-4 animate-pulse rounded-full bg-cyan-300/30 shadow-[0_0_10px_rgba(103,232,249,0.65)] flex items-center justify-center">
                        <div className="size-1.5 rounded-full bg-cyan-200" />
                      </div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TodoPlanRenderer
