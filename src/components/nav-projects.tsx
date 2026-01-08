import * as React from "react"
import { Folder, FolderOpen } from "lucide-react"
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
} from "@/components/ui/sidebar"
import { useArchiveStore } from "@/lib/store"
import type { ProcessedConversation } from "@/lib/types"

export function NavProjects() {
  const { currentFile, activeProject, selectedConversation, setActiveProject, selectConversation } = useArchiveStore()

  // Group ALL conversations by project for sidebar display (not filtered)
  const groupedConversations = React.useMemo(() => {
    if (!currentFile) return { projects: {}, standalone: [] }

    const projects: Record<string, ProcessedConversation[]> = {}
    const standalone: ProcessedConversation[] = []

    currentFile.conversations.forEach(conv => {
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
  }, [currentFile])

  const handleProjectClick = (projectId: string) => {
    setActiveProject(activeProject === projectId ? null : projectId)
  }

  const handleConversationClick = (conversation: ProcessedConversation) => {
    selectConversation(conversation)
  }

  if (!currentFile) {
    return (
      <>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                Load a JSON file to see conversations
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Standalone Messages</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                Load a JSON file to see conversations
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </>
    )
  }

  return (
    <>
      {/* Projects Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          {/* Expandable project groups */}
          {Object.entries(groupedConversations.projects).map(([projectId, conversations]) => {
            const project = currentFile.projects[projectId]
            const isActive = activeProject === projectId

            return (
              <Collapsible key={projectId} asChild defaultOpen={isActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      onClick={() => handleProjectClick(projectId)}
                      isActive={isActive}
                    >
                      {isActive ? (
                        <FolderOpen className="size-4" />
                      ) : (
                        <Folder className="size-4" />
                      )}
                      <span className="truncate">{project.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {conversations.length}
                      </span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    {conversations.map((conversation) => {
                      const isSelected = selectedConversation?.id === conversation.id;
                      return (
                        <SidebarMenuItem key={conversation.id}>
                          <SidebarMenuButton
                            onClick={() => handleConversationClick(conversation)}
                            className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:rounded-md"
                            isActive={isSelected}
                          >
                            <span className="truncate block overflow-hidden text-ellipsis whitespace-nowrap">
                              {conversation.title || `Conversation ${conversation.originalIndex + 1}`}
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>

      {/* Standalone Messages Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Standalone Messages</SidebarGroupLabel>
        <SidebarMenu>
          {groupedConversations.standalone.map((conversation) => {
            const isSelected = selectedConversation?.id === conversation.id;
            return (
              <SidebarMenuItem key={conversation.id}>
                <SidebarMenuButton
                  onClick={() => handleConversationClick(conversation)}
                  className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:rounded-md"
                  isActive={isSelected}
                  >
                  <span className="truncate pl-6 block overflow-hidden text-ellipsis whitespace-nowrap">
                    {conversation.title || `Conversation ${conversation.originalIndex + 1}`}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}