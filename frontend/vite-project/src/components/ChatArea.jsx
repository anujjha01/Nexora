import MessageList from './MessageList'
import ChatInput from './ChatInput'
import Nav from './Nav'

function ChatArea({ artifactOpen, onToggleArtifact }) {
  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden">
      <Nav artifactOpen={artifactOpen} onToggleArtifact={onToggleArtifact} />
      <div className="flex-1 overflow-y-auto flex flex-col">
        <MessageList />
      </div>
      <ChatInput />
    </div>
  )
}

export default ChatArea
