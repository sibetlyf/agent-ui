'use client'

import ChatInput from './ChatInput'
import MessageArea from './MessageArea'
const ChatArea = () => {
  return (
    <main className="pane-main relative flex flex-grow flex-col overflow-hidden">
      <MessageArea />
      <div className="sticky bottom-0 px-3 md:px-5 pb-3 pt-2 bg-gradient-to-t from-[rgba(3,8,19,0.92)] to-transparent">
        <ChatInput />
      </div>
    </main>
  )
}

export default ChatArea
