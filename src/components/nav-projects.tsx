import { Folder, MessageSquare } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
    console.log('Conversation clicked:', conversation)
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
                <MessageSquare className="size-4" />
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
                <MessageSquare className="size-4" />
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
          {/* Individual project conversations as direct items */}
          {Object.entries(groupedConversations.projects).map(([projectId, conversations]) => {
            const project = currentFile.projects[projectId]
            const isActive = activeProject === projectId

            return (
              <SidebarMenuItem key={projectId}>
                <SidebarMenuButton
                  onClick={() => handleProjectClick(projectId)}
                  isActive={isActive}
                >
                  <Folder className="size-4" />
                  <span className="truncate">{project.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {conversations.length}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>

      {/* Standalone Messages Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Standalone Messages</SidebarGroupLabel>
        <SidebarMenu>
          {groupedConversations.standalone.map((conversation) => (
            <SidebarMenuItem key={conversation.id}>
              <SidebarMenuButton
                onClick={() => handleConversationClick(conversation)}
              >
                <MessageSquare className="size-4" />
                <span className="truncate">
                  {conversation.title || `Conversation ${conversation.originalIndex + 1}`}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {conversation.formattedDate}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}