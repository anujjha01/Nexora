import { useState } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import Nav from './Nav'

function ChatArea({ artifactOpen, onToggleArtifact, onOpenSidebar }) {
  const [suggestedPrompt, setSuggestedPrompt] = useState('')

  return (
    <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Nav artifactOpen={artifactOpen} onToggleArtifact={onToggleArtifact} onOpenSidebar={onOpenSidebar} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <MessageList onSuggestionClick={setSuggestedPrompt} />
      </div>
      <ChatInput suggestedPrompt={suggestedPrompt} onSuggestionHandled={() => setSuggestedPrompt('')} />
    </main>
  )
}

export default ChatArea
