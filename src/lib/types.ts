// TypeScript interfaces for ChatGPT Archive JSON structure
// Based on V1 implementation analysis and V2 specs

export interface Author {
  role: 'user' | 'assistant' | 'system' | 'tool';
  name: string | null;
  metadata: Record<string, unknown>;
}

export interface MessageContent {
  content_type: 'text' | 'user_editable_context' | 'image' | 'multimodal_text';
  parts?: string[] | string;
  user_profile?: string;
  user_instructions?: string;
  // For multimodal content
  asset_pointers?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  author: Author;
  create_time: number | null;
  update_time: number | null;
  content: MessageContent;
  status: string;
  end_turn: boolean;
  weight: number;
  metadata: Record<string, unknown>;
  recipient: string;
  channel: string | null;
}

export interface MessageNode {
  id: string;
  message: Message;
  parent: string | null;
  children: string[];
}

export interface Conversation {
  id: string;
  title: string | null;
  create_time: number;
  update_time: number;
  mapping: Record<string, unknown>; // Can be MessageNode or other structures
  moderation_results: unknown[];
  current_node: string;
  plugin_ids: string[] | null;
  conversation_id: string;
  conversation_template_id: string | null;
  gizmo_id: string | null;
  gizmo_type: string | null;
  is_archived: boolean;
  is_starred: boolean | null;
  safe_urls: string[];
  blocked_urls: string[];
  default_model_slug: string | null;
  conversation_origin: unknown;
  is_read_only: boolean | null;
  is_do_not_remember: boolean;
  memory_scope: string;
  context_scopes: unknown;
  sugar_item_id: string | null;
  sugar_item_visible: boolean;
  owner: string | null;
  voice: string | null;
  async_status: unknown;
  disabled_tool_ids: string[];
}

// Processed conversation for UI display
export interface ProcessedConversation {
  id: string;
  title: string | null;
  create_time: number;
  update_time: number;
  gizmo_id: string | null;
  gizmo_type: string | null;
  default_model_slug: string | null;
  conversation_template_id: string | null;
  is_archived: boolean;
  is_starred: boolean | null;
  formattedDate: string;
  messages: ProcessedMessage[];
  originalIndex: number;
}

// Processed message for UI display
export interface ProcessedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  create_time: number | null;
  isFirstMessage: boolean;
  nodeId: string;
  parentId: string | null;
  childrenIds: string[];
}

// Project/grouped conversations
export interface Project {
  id: string;
  name: string;
  conversations: ProcessedConversation[];
  type: string | null;
  titles: Set<string>;
  conversationCount: number;
}

// File metadata
export interface ArchiveFile {
  filePath: string;
  fileName: string;
  fileSize: number;
  lastModified: Date;
  conversations: ProcessedConversation[];
  projects: Record<string, Project>;
  totalConversations: number;
  totalProjects: number;
}

// Error types
export interface ParseError {
  type: 'invalid_json' | 'missing_field' | 'corrupted_data';
  message: string;
  conversationId?: string;
  nodeId?: string;
}

// Legacy types for compatibility
export interface LegacyConversation {
  title: string;
  date: string;
  text: string;
  role: string;
  originalIndex: number;
  gizmoId?: string;
  gizmoType?: string;
}

// Utility types for processing
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type ContentType = 'text' | 'user_editable_context' | 'image' | 'multimodal_text';
