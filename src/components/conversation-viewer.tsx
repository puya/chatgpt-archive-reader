// React is not used directly in this component
import { User, Bot, Calendar } from "lucide-react"
import { useArchiveStore } from "@/lib/store"
import type { ProcessedMessage } from "@/lib/types"

export function ConversationViewer() {
  const { selectedConversation } = useArchiveStore()

  console.log('ConversationViewer render, selectedConversation:', selectedConversation)

  if (!selectedConversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <Bot className="mx-auto size-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Select a Conversation</h3>
            <p className="text-sm text-muted-foreground">
              Choose a conversation from the sidebar to view its messages
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Conversation Header */}
      <div className="border-b p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">
              {selectedConversation.title || `Conversation ${selectedConversation.originalIndex + 1}`}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                {selectedConversation.formattedDate}
              </div>
              <div>
                {selectedConversation.messages.length} messages
              </div>
              {selectedConversation.default_model_slug && (
                <div className="flex items-center gap-1">
                  <Bot className="size-4" />
                  {selectedConversation.default_model_slug}
                </div>
              )}
            </div>
          </div>
          {/* Future: Tags and actions */}
          <div className="flex items-center gap-2">
            {/* Placeholder for tags */}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedConversation.messages.map((message, index) => (
          <MessageBubble
            key={`${message.id}-${index}`}
            message={message}
            isLast={index === selectedConversation.messages.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: ProcessedMessage
  isLast: boolean
}

function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="size-4 text-primary" />
          </div>
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div className={`rounded-lg p-3 ${
          isUser
            ? 'bg-primary text-primary-foreground ml-auto'
            : 'bg-muted'
        }`}>
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>

        {isLast && (
          <div className="text-xs text-muted-foreground mt-1 px-3">
            {message.create_time ? new Date(message.create_time * 1000).toLocaleString() : 'Unknown time'}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="size-4" />
          </div>
        </div>
      )}
    </div>
  )
}
