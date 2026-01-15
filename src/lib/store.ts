// Zustand store for ChatGPT Archive Reader state management

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import Fuse from 'fuse.js';
import type { ArchiveFile, ProcessedConversation, ParseError } from '@/lib/types';

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
  expandedProjects: Set<string>; // Projects expanded in sidebar (separate from filtering)

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
  toggleProjectExpansion: (projectId: string) => void;
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
    expandedProjects: new Set<string>(),
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

    toggleProjectExpansion: (projectId) => set((state) => {
      const newExpanded = new Set(state.expandedProjects);
      if (newExpanded.has(projectId)) {
        newExpanded.delete(projectId);
      } else {
        newExpanded.add(projectId);
      }
      return { expandedProjects: newExpanded };
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
      expandedProjects: new Set<string>(),
      conversationTags: {}
    })
  }))
);

// Selectors for computed values
export const useFilteredConversations = () => {
  const { currentFile, activeProject, searchTerm } = useArchiveStore();

  if (!currentFile) return [];

  let conversations = currentFile.conversations;

  // If there's a search term, search across ALL conversations first
  if (searchTerm.trim()) {
    const fuse = new Fuse(currentFile.conversations, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'messages.content', weight: 0.3 }
      ],
      threshold: 0.0, // Exact matches only (no typos allowed)
      includeScore: true,
      shouldSort: true,
    });

    const searchResults = fuse.search(searchTerm);
    conversations = searchResults.map(result => result.item);

    // After search, still apply project filter if one is active
    if (activeProject === 'standalone') {
      conversations = conversations.filter(conv => !conv.gizmo_id);
    } else if (activeProject) {
      conversations = conversations.filter(conv => conv.gizmo_id === activeProject);
    }
  } else {
    // No search term - just filter by project
    if (activeProject === 'standalone') {
      conversations = conversations.filter(conv => !conv.gizmo_id);
    } else if (activeProject) {
      conversations = conversations.filter(conv => conv.gizmo_id === activeProject);
    }
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

export const useSearchResultsCount = () => {
  const filtered = useFilteredConversations();
  const { searchTerm } = useArchiveStore();

  if (!searchTerm.trim()) return null;

  return filtered.length;
};
