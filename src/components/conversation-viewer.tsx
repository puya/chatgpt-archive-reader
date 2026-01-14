import { useEffect, useRef } from "react"
import { User, Bot, Calendar } from "lucide-react"
import { useArchiveStore } from "@/lib/store"
import type { ProcessedMessage } from "@/lib/types"

export function ConversationViewer() {
  const { selectedConversation, searchTerm } = useArchiveStore()
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to first search match when conversation changes
  useEffect(() => {
    if (!selectedConversation || !searchTerm.trim() || !messagesContainerRef.current) return

    // Find the first message that contains the search term
    const firstMatchingMessageIndex = selectedConversation.messages.findIndex(message =>
      message.content.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (firstMatchingMessageIndex >= 0) {
      // Scroll to the message after a short delay to allow rendering
      setTimeout(() => {
        const messageElements = messagesContainerRef.current?.querySelectorAll('[data-message-index]')
        const targetElement = messageElements?.[firstMatchingMessageIndex] as HTMLElement
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [selectedConversation, searchTerm])

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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedConversation.messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No messages found in this conversation
          </div>
        ) : (
          selectedConversation.messages.map((message, index) => (
            <MessageBubble
              key={`${message.id}-${index}`}
              message={message}
              isLast={index === selectedConversation.messages.length - 1}
              searchTerm={searchTerm}
              messageIndex={index}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: ProcessedMessage
  isLast: boolean
  searchTerm: string
  messageIndex: number
}

// Function to highlight search terms in text
function highlightSearchTerm(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) return text

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-600 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function MessageBubble({ message, isLast, searchTerm, messageIndex }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      data-message-index={messageIndex}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
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
            {highlightSearchTerm(message.content, searchTerm)}
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
