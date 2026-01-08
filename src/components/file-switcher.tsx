import * as React from "react"
import { FileText, Upload, X } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useArchiveStore, useProjectStats } from "@/lib/store"
import { readArchiveFile, validateArchiveFile } from "@/lib/file-utils"
import { formatFileSize } from "@/lib/file-utils"

export function FileSwitcher() {
  const { currentFile, isLoading, loadArchiveFile, setLoading, setLoadError, setParseErrors } = useArchiveStore()
  const { totalConversations, totalProjects } = useProjectStats()
  const { isMobile } = useSidebar()

  const handleFileSelect = async () => {
    try {
      setLoading(true)
      setLoadError(null)

      // Trigger file picker
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        // Validate file
        const validation = validateArchiveFile(file)
        if (!validation.valid) {
          setLoadError(validation.error!)
          setLoading(false)
          return
        }

        // Read and parse file
        const result = await readArchiveFile(file)
        setParseErrors(result.errors)

        if (result.success && result.data) {
          loadArchiveFile(result.data)
        } else {
          setLoadError(result.errorMessage || 'Failed to load file')
        }

        setLoading(false)
      }
      input.click()
    } catch (error) {
      setLoadError(`File selection failed: ${error}`)
      setLoading(false)
    }
  }

  const handleFileClear = () => {
    loadArchiveFile(null)
    setLoadError(null)
    setParseErrors([])
  }

  const activeFile = currentFile ? {
    name: currentFile.fileName,
    logo: FileText,
    status: "Loaded",
    conversationCount: totalConversations,
    projectCount: totalProjects,
    fileSize: formatFileSize(currentFile.fileSize)
  } : null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {activeFile ? (
                <>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <activeFile.logo className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeFile.name}
                    </span>
                    <span className="truncate text-xs">
                      {activeFile.conversationCount} convs, {activeFile.projectCount} projects
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {activeFile.fileSize}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Upload className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {isLoading ? "Loading..." : "Select JSON File"}
                    </span>
                    <span className="truncate text-xs">
                      {isLoading ? "Please wait..." : "Click to choose conversations.json"}
                    </span>
                  </div>
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              ChatGPT Archive Files
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleFileSelect} disabled={isLoading}>
              <Upload className="mr-2 size-4" />
              {isLoading ? "Loading..." : "Load Archive File"}
            </DropdownMenuItem>
            {activeFile && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleFileClear}>
                  <X className="mr-2 size-4" />
                  Clear File
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
