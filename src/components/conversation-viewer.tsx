import { useEffect, useRef, useState, useMemo } from "react"
import { User, Bot, Calendar, ChevronUp, ChevronDown } from "lucide-react"
import { useArchiveStore } from "@/lib/store"
import type { ProcessedMessage } from "@/lib/types"

export function ConversationViewer() {
  const { selectedConversation, searchTerm } = useArchiveStore()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  // Track all search matches in the conversation
  const searchMatches = useMemo(() => {
    if (!selectedConversation || !searchTerm.trim()) return []

    const matches: Array<{ messageIndex: number; matchIndex: number }> = []
    let globalMatchIndex = 0

    selectedConversation.messages.forEach((message, messageIndex) => {
      const content = message.content.toLowerCase()
      const searchLower = searchTerm.toLowerCase()
      let startIndex = 0
      let foundIndex

      while ((foundIndex = content.indexOf(searchLower, startIndex)) !== -1) {
        matches.push({
          messageIndex,
          matchIndex: globalMatchIndex
        })
        globalMatchIndex++
        startIndex = foundIndex + 1
      }
    })

    return matches
  }, [selectedConversation, searchTerm])

  // Reset current match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0)
  }, [searchTerm])

  // Navigation functions
  const goToNextMatch = () => {
    if (searchMatches.length === 0) return
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length
    setCurrentMatchIndex(nextIndex)
    scrollToMatch(nextIndex)
  }

  const goToPrevMatch = () => {
    if (searchMatches.length === 0) return
    const prevIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1
    setCurrentMatchIndex(prevIndex)
    scrollToMatch(prevIndex)
  }

  const scrollToMatch = (matchIndex: number) => {
    if (!messagesContainerRef.current || searchMatches.length === 0) return

    const match = searchMatches[matchIndex]
    if (!match) return

    setTimeout(() => {
      const messageElements = messagesContainerRef.current?.querySelectorAll('[data-message-index]')
      const targetElement = messageElements?.[match.messageIndex] as HTMLElement
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  // Scroll to first search match when conversation changes
  useEffect(() => {
    if (!selectedConversation || !searchTerm.trim()) return
    setCurrentMatchIndex(0)
    if (searchMatches.length > 0) {
      scrollToMatch(0)
    }
  }, [selectedConversation, searchTerm, searchMatches.length])

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
          selectedConversation.messages.map((message, index) => {
            // Find matches in this message
            const messageMatches = searchMatches.filter(match => match.messageIndex === index)
            return (
              <MessageBubble
                key={`${message.id}-${index}`}
                message={message}
                isLast={index === selectedConversation.messages.length - 1}
                searchTerm={searchTerm}
                messageIndex={index}
                messageMatchIndices={messageMatches.map(m => m.matchIndex)}
                currentMatchIndex={searchMatches.length > 0 ? currentMatchIndex : -1}
              />
            )
          })
        )}
      </div>

      {/* Floating Search Navigation */}
      {searchMatches.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
            <div className="text-xs text-muted-foreground text-center mb-2">
              {currentMatchIndex + 1} of {searchMatches.length}
            </div>
            <div className="flex gap-1">
              <button
                onClick={goToPrevMatch}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                title="Previous match"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                onClick={goToNextMatch}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                title="Next match"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: ProcessedMessage
  isLast: boolean
  searchTerm: string
  messageIndex: number
  messageMatchIndices: number[]
  currentMatchIndex: number
}

// Function to highlight search terms in text
function highlightSearchTerm(
  text: string,
  searchTerm: string,
  messageMatchIndices: number[],
  currentMatchIndex: number,
  globalMatchOffset: number
): React.ReactNode {
  if (!searchTerm.trim()) return text

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  let matchCount = 0

  return parts.map((part, index) => {
    if (regex.test(part)) {
      const globalMatchIndex = globalMatchOffset + matchCount
      const isCurrentMatch = globalMatchIndex === currentMatchIndex
      matchCount++

      return (
        <mark
          key={index}
          className={`px-0.5 rounded ${
            isCurrentMatch
              ? 'bg-orange-400 dark:bg-orange-500 text-white'
              : 'bg-yellow-200 dark:bg-yellow-600'
          }`}
        >
          {part}
        </mark>
      )
    }
    return part
  })
}

function MessageBubble({ message, isLast, searchTerm, messageIndex, messageMatchIndices, currentMatchIndex }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  // Calculate the offset for this message's first match in the global matches array
  const matchOffset = messageMatchIndices.length > 0 ? Math.min(...messageMatchIndices) : 0

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
            {highlightSearchTerm(message.content, searchTerm, messageMatchIndices, currentMatchIndex, matchOffset)}
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
