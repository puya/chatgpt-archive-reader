import * as React from "react"
import {
  Bot,
  FileText,
  Frame,
  MessageSquare,
  PieChart,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// ChatGPT Archive Reader specific data
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  // File switcher - will contain loaded JSON files
  files: [
    {
      name: "conversations.json",
      logo: FileText,
      status: "Loaded",
      conversationCount: 2156,
    },
    // Future: Support multiple JSON files
    // {
    //   name: "work-archive.json",
    //   logo: MessageSquare,
    //   status: "Available",
    //   conversationCount: 0,
    // },
  ],
  // Grouped conversations by project (like the old "Playground" section)
  projects: [
    {
      title: "Web Development",
      url: "#",
      icon: Frame,
      isActive: false,
      items: [
        {
          title: "React Component Issues",
          url: "#",
        },
        {
          title: "Database Schema Design",
          url: "#",
        },
        {
          title: "API Integration Help",
          url: "#",
        },
      ],
    },
    {
      title: "AI/ML Research",
      url: "#",
      icon: Bot,
      isActive: true,
      items: [
        {
          title: "Neural Network Architecture",
          url: "#",
        },
        {
          title: "Dataset Preparation",
          url: "#",
        },
        {
          title: "Model Training Issues",
          url: "#",
        },
      ],
    },
    {
      title: "Business Strategy",
      url: "#",
      icon: PieChart,
      isActive: false,
      items: [
        {
          title: "Market Analysis Discussion",
          url: "#",
        },
        {
          title: "Competitor Research",
          url: "#",
        },
      ],
    },
  ],
  // Individual conversations not grouped into projects
  standaloneConversations: [
    {
      name: "Quick Code Review",
      url: "#",
      icon: MessageSquare,
    },
    {
      name: "Personal Planning",
      url: "#",
      icon: MessageSquare,
    },
    {
      name: "Random Ideas",
      url: "#",
      icon: MessageSquare,
    },
    {
      name: "Meeting Notes",
      url: "#",
      icon: MessageSquare,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.files} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.projects} />
        <NavProjects projects={data.standaloneConversations} />
      </SidebarContent>
      <SidebarFooter>
        {/* TODO: Replace with user info from JSON file */}
        <div className="p-4 text-sm text-muted-foreground">
          User info from JSON will appear here
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
