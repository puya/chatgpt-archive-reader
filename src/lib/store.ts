// Zustand store for ChatGPT Archive Reader state management

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ArchiveFile, ProcessedConversation, ParseError } from './types';

interface ArchiveState {
  // File data
  currentFile: ArchiveFile | null;
  isLoading: boolean;
  loadError: string | null;
  parseErrors: ParseError[];

  // UI state
  selectedConversation: ProcessedConversation | null;
  activeProject: string | null; // gizmo_id or null for all, 'standalone' for ungrouped
  searchTerm: string;

  // Tag management (for future implementation)
  conversationTags: Record<string, string[]>;

  // Actions
  loadArchiveFile: (file: ArchiveFile | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  setParseErrors: (errors: ParseError[]) => void;
  selectConversation: (conversation: ProcessedConversation | null) => void;
  setActiveProject: (projectId: string | null) => void;
  setSearchTerm: (term: string) => void;
  addTag: (conversationId: string, tag: string) => void;
  removeTag: (conversationId: string, tag: string) => void;
  clearData: () => void;
}

export const useArchiveStore = create<ArchiveState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentFile: null,
    isLoading: false,
    loadError: null,
    parseErrors: [],
    selectedConversation: null,
    activeProject: null,
    searchTerm: '',
    conversationTags: {},

    // Actions
    loadArchiveFile: (file) => set({
      currentFile: file,
      loadError: null,
      parseErrors: [],
      selectedConversation: null,
      activeProject: null,
      searchTerm: ''
    }),

    setLoading: (loading) => set({ isLoading: loading }),

    setLoadError: (error) => set({ loadError: error }),

    setParseErrors: (errors) => set({ parseErrors: errors }),

    selectConversation: (conversation) => set({ selectedConversation: conversation }),

    setActiveProject: (projectId) => set({
      activeProject: projectId,
      selectedConversation: null // Clear selection when changing projects
    }),

    setSearchTerm: (term) => set({
      searchTerm: term,
      selectedConversation: null // Clear selection when searching
    }),

    addTag: (conversationId, tag) => {
      const { conversationTags } = get();
      const currentTags = conversationTags[conversationId] || [];

      if (!currentTags.includes(tag)) {
        set({
          conversationTags: {
            ...conversationTags,
            [conversationId]: [...currentTags, tag]
          }
        });
      }
    },

    removeTag: (conversationId, tag) => {
      const { conversationTags } = get();
      const currentTags = conversationTags[conversationId] || [];

      set({
        conversationTags: {
          ...conversationTags,
          [conversationId]: currentTags.filter(t => t !== tag)
        }
      });
    },

    clearData: () => set({
      currentFile: null,
      loadError: null,
      parseErrors: [],
      selectedConversation: null,
      activeProject: null,
      searchTerm: '',
      conversationTags: {}
    })
  }))
);

// Selectors for computed values
export const useFilteredConversations = () => {
  const { currentFile, activeProject, searchTerm } = useArchiveStore();

  if (!currentFile) return [];

  let conversations = currentFile.conversations;

  // Filter by project
  if (activeProject === 'standalone') {
    conversations = conversations.filter(conv => !conv.gizmo_id);
  } else if (activeProject) {
    conversations = conversations.filter(conv => conv.gizmo_id === activeProject);
  }

  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    conversations = conversations.filter(conv =>
      (conv.title && conv.title.toLowerCase().includes(term)) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(term))
    );
  }

  return conversations;
};

export const useProjectStats = () => {
  const { currentFile } = useArchiveStore();

  if (!currentFile) {
    return {
      totalConversations: 0,
      totalProjects: 0,
      standaloneConversations: 0
    };
  }

  const standaloneConversations = currentFile.conversations.filter(conv => !conv.gizmo_id).length;

  return {
    totalConversations: currentFile.totalConversations,
    totalProjects: currentFile.totalProjects,
    standaloneConversations
  };
};

export const useConversationTags = (conversationId: string) => {
  const { conversationTags } = useArchiveStore();
  return conversationTags[conversationId] || [];
};

export const useAllTags = () => {
  const { conversationTags } = useArchiveStore();

  const allTags = new Set<string>();
  Object.values(conversationTags).forEach(tags => {
    tags.forEach(tag => allTags.add(tag));
  });

  return Array.from(allTags).sort();
};
