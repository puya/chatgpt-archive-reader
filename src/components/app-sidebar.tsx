import * as React from "react"
import { FileSwitcher } from "@/components/file-switcher"
import { NavProjects } from "@/components/nav-projects"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useArchiveStore } from "@/lib/store"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentFile, loadError, parseErrors } = useArchiveStore()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <FileSwitcher />
        {loadError && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50 rounded-md mx-2">
            Error: {loadError}
          </div>
        )}
        {parseErrors.length > 0 && (
          <div className="px-4 py-2 text-xs text-yellow-600 bg-yellow-50 rounded-md mx-2">
            {parseErrors.length} parsing errors - check console
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavProjects />
      </SidebarContent>
      <SidebarFooter>
        {/* TODO: Replace with user info from JSON file */}
        <div className="p-4 text-sm text-muted-foreground">
          {currentFile ? (
            <div className="space-y-1">
              <div>Archive loaded successfully</div>
              <div className="text-xs">
                {currentFile.totalConversations} conversations
              </div>
            </div>
          ) : (
            "Load a conversations.json file to get started"
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
