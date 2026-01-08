import * as React from "react"
import { ChevronRight, Folder, MessageSquare } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useArchiveStore, useFilteredConversations } from "@/lib/store"
import type { ProcessedConversation } from "@/lib/types"

export function NavProjects() {
  const { currentFile, activeProject, setActiveProject, selectConversation } = useArchiveStore()

  // Get filtered conversations based on current filters
  const filteredConversations = useFilteredConversations()

  // Group conversations by project for display
  const groupedConversations = React.useMemo(() => {
    if (!currentFile) return { projects: {}, standalone: [] }

    const projects: Record<string, ProcessedConversation[]> = {}
    const standalone: ProcessedConversation[] = []

    filteredConversations.forEach(conv => {
      if (conv.gizmo_id && currentFile.projects[conv.gizmo_id]) {
        if (!projects[conv.gizmo_id]) {
          projects[conv.gizmo_id] = []
        }
        projects[conv.gizmo_id].push(conv)
      } else {
        standalone.push(conv)
      }
    })

    return { projects, standalone }
  }, [currentFile, filteredConversations])

  const handleProjectClick = (projectId: string) => {
    setActiveProject(activeProject === projectId ? null : projectId)
  }

  const handleConversationClick = (conversation: ProcessedConversation) => {
    selectConversation(conversation)
  }

  if (!currentFile) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <MessageSquare className="size-4" />
              Load a JSON file to see conversations
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {/* All Conversations option */}
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setActiveProject(null)}
            isActive={activeProject === null}
          >
            <Folder className="size-4" />
            All Conversations ({currentFile.totalConversations})
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Project groups */}
        {Object.entries(groupedConversations.projects).map(([projectId, conversations]) => {
          const project = currentFile.projects[projectId]
          const isActive = activeProject === projectId
          const isExpanded = isActive

          return (
            <Collapsible key={projectId} asChild defaultOpen={isExpanded}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => handleProjectClick(projectId)}
                    isActive={isActive}
                  >
                    <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    <Folder className="size-4" />
                    <span className="truncate">{project.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {conversations.length}
                    </span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {conversations.map((conversation) => (
                      <SidebarMenuSubItem key={conversation.id}>
                        <SidebarMenuSubButton
                          onClick={() => handleConversationClick(conversation)}
                        >
                          <MessageSquare className="size-4" />
                          <span className="truncate">
                            {conversation.title || `Conversation ${conversation.originalIndex + 1}`}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {conversation.formattedDate}
                          </span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}

        {/* Standalone conversations */}
        {groupedConversations.standalone.length > 0 && (
          <SidebarMenuItem>
            <Collapsible asChild defaultOpen={activeProject === 'standalone'}>
              <div>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => setActiveProject(activeProject === 'standalone' ? null : 'standalone')}
                    isActive={activeProject === 'standalone'}
                  >
                    <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    <MessageSquare className="size-4" />
                    Standalone Messages ({groupedConversations.standalone.length})
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {groupedConversations.standalone.map((conversation) => (
                      <SidebarMenuSubItem key={conversation.id}>
                        <SidebarMenuSubButton
                          onClick={() => handleConversationClick(conversation)}
                        >
                          <MessageSquare className="size-4" />
                          <span className="truncate">
                            {conversation.title || `Conversation ${conversation.originalIndex + 1}`}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {conversation.formattedDate}
                          </span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}