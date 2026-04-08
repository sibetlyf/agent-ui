'use client'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import RightSidebar from '@/components/chat/RightSidebar/RightSidebar'
import { Suspense } from 'react'
import { useStore } from '@/store'

export default function Home() {
  // Check if OS_SECURITY_KEY is defined on server-side
  const hasEnvToken = !!process.env.NEXT_PUBLIC_OS_SECURITY_KEY
  const envToken = process.env.NEXT_PUBLIC_OS_SECURITY_KEY || ''
  
  const selectedToolCall = useStore((state) => state.selectedToolCall)
  const selectedMetadata = useStore((state) => state.selectedMetadata)
  const showRightSidebar = selectedToolCall !== null || selectedMetadata !== null

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex h-screen bg-background/80 overflow-hidden">
        <Sidebar hasEnvToken={hasEnvToken} envToken={envToken} />
        <div className="flex-1 flex overflow-hidden">
          <ChatArea />
        </div>
        {showRightSidebar && (
          <div className="flex-none h-full shadow-2xl z-10 transition-all duration-300 ease-in-out border-l border-border/40">
            <RightSidebar />
          </div>
        )}
      </div>
    </Suspense>
  )
}
