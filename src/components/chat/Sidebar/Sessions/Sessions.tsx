'use client'

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryState } from 'nuqs'
import dayjs from 'dayjs'

import { useStore } from '@/store'
import useSessionLoader from '@/hooks/useSessionLoader'

import SessionItem from './SessionItem'
import SessionBlankState from './SessionBlankState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SkeletonListProps {
  skeletonCount: number
}
const SkeletonList: FC<SkeletonListProps> = ({ skeletonCount }) => {
  const list = useMemo(
    () => Array.from({ length: skeletonCount }, (_, i) => i),
    [skeletonCount]
  )

  return list.map((k, idx) => (
    <Skeleton
      key={k}
      className={cn(
        'mb-1 h-11 rounded-lg px-3 py-2',
        idx > 0 && 'bg-background-secondary'
      )}
    />
  ))
}

const Sessions = () => {
  const [agentId] = useQueryState('agent', {
    parse: (v: string | null) => v || undefined,
    history: 'push'
  })
  const [teamId] = useQueryState('team')
  const [sessionId] = useQueryState('session')
  const [dbId] = useQueryState('db_id')

  const {
    selectedEndpoint,
    mode,
    isEndpointActive,
    isEndpointLoading,
    hydrated,
    sessionsData,
    setSessionsData,
    isSessionsLoading
  } = useStore()

  const [isScrolling, setIsScrolling] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  )

  const { getSessions, getSession } = useSessionLoader()
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleScroll = () => {
    setIsScrolling(true)

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 1500)
  }

  // Cleanup the scroll timeout when component unmounts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (hydrated && sessionId && selectedEndpoint && (agentId || teamId)) {
      const entityType = agentId ? 'agent' : 'team'
      getSession({ entityType, agentId, teamId, dbId }, sessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, sessionId, selectedEndpoint, agentId, teamId, dbId])

  useEffect(() => {
    if (!selectedEndpoint || isEndpointLoading) return
    if (!(agentId || teamId || dbId)) {
      setSessionsData([])
      return
    }
    setSessionsData([])
    getSessions({
      entityType: mode,
      agentId,
      teamId,
      dbId
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedEndpoint,
    agentId,
    teamId,
    mode,
    isEndpointLoading,
    getSessions,
    dbId
  ])

  useEffect(() => {
    if (sessionId) setSelectedSessionId(sessionId)
  }, [sessionId])

  const handleSessionClick = useCallback(
    (id: string) => () => setSelectedSessionId(id),
    []
  )

  const groupedSessions = useMemo(() => {
    if (!sessionsData) return {}
    
    const groups: Record<string, typeof sessionsData> = {
      Today: [],
      Yesterday: [],
      Previous: []
    }

    const now = dayjs()
    sessionsData.forEach(session => {
      const date = dayjs(session.created_at ? session.created_at * 1000 : undefined)
      if (date.isSame(now, 'day')) {
        groups.Today.push(session)
      } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
        groups.Yesterday.push(session)
      } else {
        groups.Previous.push(session)
      }
    })

    return groups
  }, [sessionsData])

  if (isSessionsLoading || isEndpointLoading) {
    return (
      <div className="w-full px-2">
        <div className="mb-4 h-4 w-20 rounded bg-white/5 animate-pulse" />
        <div className="mt-4 h-[calc(100vh-325px)] w-full overflow-y-auto">
          <SkeletonList skeletonCount={8} />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col pt-2 font-geist">
      <div
        className={`flex-1 overflow-y-auto pr-1 transition-all duration-300 [&::-webkit-scrollbar]:w-1 ${
          isScrolling
            ? '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent'
            : ''
        }`}
        onScroll={handleScroll}
        onMouseOver={() => setIsScrolling(true)}
        onMouseLeave={handleScroll}
      >
        {!isEndpointActive ||
        (!isSessionsLoading &&
          (!sessionsData || sessionsData?.length === 0)) ? (
          <SessionBlankState />
        ) : (
          <div className="flex flex-col gap-y-6 px-1">
            {Object.entries(groupedSessions).map(([group, sessions]) => 
              sessions.length > 0 && (
                <div key={group} className="flex flex-col gap-y-1.5">
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500/70">
                    {group}
                  </h3>
                  <div className="flex flex-col gap-y-0.5">
                    {sessions.map((entry, idx) => (
                      <SessionItem
                        key={`${entry?.session_id}-${idx}`}
                        currentSessionId={selectedSessionId}
                        isSelected={selectedSessionId === entry?.session_id}
                        onSessionClick={handleSessionClick(entry?.session_id)}
                        session_name={entry?.session_name ?? '-'}
                        session_id={entry?.session_id}
                        created_at={entry?.created_at}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Sessions
