// Utility functions for processing ChatGPT archive conversations
// Based on V1 implementation with TypeScript types

import {
  Conversation,
  ProcessedConversation,
  ProcessedMessage,
  MessageNode,
  Project,
  ParseError,
  MessageRole,
  ArchiveFile
} from '@/lib/types';

/**
 * Safely extract nested properties from objects
 */
export const safeGet = <T>(obj: unknown, path: string, defaultValue: T): T => {
  return path.split('.').reduce((current, key) =>
    current && typeof current === 'object' && current !== null && key in current ? (current as Record<string, unknown>)[key] : defaultValue, obj as Record<string, unknown>);
};

/**
 * Format Unix timestamp to readable date string
 */
export const formatTimestamp = (timestamp: number | null): string => {
  if (!timestamp) return 'N/A';
  // Handle both seconds and milliseconds timestamps
  const date = timestamp > 1e10 ? new Date(timestamp) : new Date(timestamp * 1000);
  return date.toLocaleDateString();
};

/**
 * Format Unix timestamp to full date-time string
 */
export const formatTimestampFull = (timestamp: number | null): string => {
  if (!timestamp) return 'N/A';
  const date = timestamp > 1e10 ? new Date(timestamp) : new Date(timestamp * 1000);
  return date.toLocaleString();
};

/**
 * Extract text content from message content structure
 */
export const extractMessageContent = (content: unknown): string => {
  if (!content || typeof content !== 'object') return '';

  const contentObj = content as Record<string, unknown>;

  // Handle different content types
  if (contentObj.content_type === 'text' && contentObj.parts) {
    return Array.isArray(contentObj.parts) ? contentObj.parts.join(' ') : String(contentObj.parts);
  }

  if (contentObj.content_type === 'user_editable_context') {
    const profile = String(contentObj.user_profile || '');
    const instructions = String(contentObj.user_instructions || '');
    return `${profile}\n\n${instructions}`.trim();
  }

  // Fallback for other content types
  if (contentObj.parts) {
    return Array.isArray(contentObj.parts) ? contentObj.parts.join(' ') : String(contentObj.parts);
  }

  return '';
};

/**
 * Process conversation mapping into chronological message array
 * Based on V1's format_conversation_text_with_breaks logic
 */
export const processConversationMessages = (mapping: Record<string, MessageNode>): ProcessedMessage[] => {
  const messages: ProcessedMessage[] = [];
  const processedNodes = new Set<string>();

  // Find root nodes (messages without parents or with null parent)
  const rootNodes = Object.values(mapping).filter(node =>
    !node.parent || node.parent === null || !mapping[node.parent]
  );

  // Process messages in tree order (depth-first)
  const processNode = (node: MessageNode, depth = 0): void => {
    if (processedNodes.has(node.id)) return;
    processedNodes.add(node.id);

    const message = node.message;
    if (!message || !message.content) return;

    const content = extractMessageContent(message.content);
    if (!content.trim()) return; // Skip empty messages

    const processedMessage: ProcessedMessage = {
      id: message.id,
      role: message.author.role as MessageRole,
      content,
      create_time: message.create_time,
      isFirstMessage: messages.length === 0,
      nodeId: node.id,
      parentId: node.parent,
      childrenIds: node.children
    };

    messages.push(processedMessage);

    // Process children recursively
    node.children.forEach(childId => {
      const childNode = mapping[childId];
      if (childNode) {
        processNode(childNode, depth + 1);
      }
    });
  };

  // Start processing from root nodes
  rootNodes.forEach(node => processNode(node));

  return messages;
};

/**
 * Process raw conversation data into ProcessedConversation
 */
export const processConversation = (rawConv: Conversation, index: number): ProcessedConversation => {
  const messages = processConversationMessages(rawConv.mapping);

  return {
    id: rawConv.id,
    title: safeGet(rawConv, 'title', null),
    create_time: rawConv.create_time,
    update_time: rawConv.update_time,
    gizmo_id: safeGet(rawConv, 'gizmo_id', null),
    gizmo_type: safeGet(rawConv, 'gizmo_type', null),
    default_model_slug: safeGet(rawConv, 'default_model_slug', null),
    conversation_template_id: safeGet(rawConv, 'conversation_template_id', null),
    is_archived: safeGet(rawConv, 'is_archived', false),
    is_starred: safeGet(rawConv, 'is_starred', null),
    formattedDate: formatTimestamp(rawConv.create_time),
    messages,
    originalIndex: index
  };
};

/**
 * Derive project name from gizmo_id and conversation titles
 * Enhanced version of V1's deriveProjectName function
 */
export const deriveProjectName = (gizmoId: string, conversationTitles: string[]): string => {
  const titles = conversationTitles.filter(Boolean);

  // Method 1: Look for explicit project names in titles
  const projectPatterns = [
    /^(.*?)\s*[:-]\s*Project/i,  // "Something - Project"
    /^Project\s*[:-]\s*(.*)$/i,  // "Project - Something"
    /^(.*?)\s+Project\s*$/i,     // "Something Project"
    /^(.*?)\s*&\s*(.*)$/i,       // "Brand & Theme" patterns
    /^(.*?)\s+(Plan|Planning|Strategy|Trip|Story|Stories)$/i,  // Common project suffixes
  ];

  for (const title of titles) {
    for (const pattern of projectPatterns) {
      const match = title.match(pattern);
      if (match) {
        let extractedName = '';
        if (match[1] && match[2]) {
          // For patterns with two meaningful parts (like & or Trip/Story)
          extractedName = `${match[1].trim()} ${match[2].trim()}`;
        } else if (match[1]) {
          extractedName = match[1].trim();
        }

        if (extractedName && 3 <= extractedName.length && extractedName.length <= 50) {
          // Clean up the name
          extractedName = extractedName.replace(/['"]/g, ''); // Remove quotes
          return extractedName;
        }
      }
    }
  }

  // Method 2: Check for titles that are clearly project names
  const projectTitles = titles.filter(title =>
    title && (title.toLowerCase().includes('plan') ||
              title.toLowerCase().includes('strategy') ||
              title.toLowerCase().includes('system') ||
              title.toLowerCase().includes('platform') ||
              title.toLowerCase().includes('app') ||
              title.toLowerCase().includes('tool') ||
              title.toLowerCase().includes('design') ||
              title.toLowerCase().includes('development'))
  );

  if (projectTitles.length > 0) {
    return projectTitles[0];
  }

  // Method 3: Enhanced common theme detection
  if (titles.length > 1) {
    const titleWords: string[] = [];
    titles.slice(0, 10).forEach(title => {  // Check first 10 titles
      const words = title.toLowerCase().split(/\s+/)
        .filter(word => word.length > 2 &&
               !['the', 'and', 'for', 'with', 'from', 'this', 'that', 'chat', 'new',
                'how', 'what', 'why', 'when', 'where', 'who', 'can', 'will', 'should',
                'are', 'but', 'not', 'all', 'one', 'had', 'has', 'was', 'were', 'you',
                'your', 'they', 'their', 'our', 'its', 'his', 'her', 'our'].includes(word));
      titleWords.push(...words);
    });

    const wordCounts: Record<string, number> = {};
    titleWords.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Find distinctive words that appear in multiple titles
    const commonWords = Object.entries(wordCounts)
      .filter(([word, count]) => count >= Math.min(2, titles.length) && word.length > 2)
      .sort((a, b) => b[1] - a[1])  // Sort by frequency
      .map(([word]) => word);

    // Look for brand/product names that appear frequently
    const brandWords = commonWords.filter(word =>
      word.length > 3 && /^[a-zA-Z]+$/.test(word) && !['using', 'about', 'create', 'make'].includes(word)
    );

    if (brandWords.length >= 2) {
      // Combine most frequent brand words
      const topBrands = brandWords.slice(0, 2);
      return topBrands.join(' ').replace(/\b\w/g, l => l.toUpperCase());
    } else if (brandWords.length === 1 && commonWords.length >= 3) {
      // If we have one strong brand word and other common terms
      return brandWords[0].charAt(0).toUpperCase() + brandWords[0].slice(1);
    } else if (commonWords.length >= 2) {
      // Fallback to most common words
      const topWords = commonWords.slice(0, 2);
      return topWords.join(' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  // Method 4: Use the most descriptive title as fallback
  if (titles.length > 0) {
    const bestTitle = titles
      .filter(title => title && title.length > 10 && title.length < 40)
      .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)[0];

    if (bestTitle) {
      return bestTitle;
    }
  }

  // Fallback to a generic project name based on gizmo ID
  return `Project ${gizmoId.split('-').pop()?.substring(0, 8) || gizmoId}`;
};

/**
 * Group conversations by projects (gizmo_id)
 */
export const groupConversationsByProjects = (conversations: ProcessedConversation[]): Record<string, Project> => {
  const projects: Record<string, Project> = {};

  conversations.forEach(conversation => {
    if (conversation.gizmo_id) {
      if (!projects[conversation.gizmo_id]) {
        projects[conversation.gizmo_id] = {
          id: conversation.gizmo_id,
          conversations: [],
          type: conversation.gizmo_type,
          titles: new Set(),
          name: '',
          conversationCount: 0
        };
      }

      projects[conversation.gizmo_id].conversations.push(conversation);
      if (conversation.title) {
        projects[conversation.gizmo_id].titles.add(conversation.title);
      }
    }
  });

  // Derive project names
  Object.values(projects).forEach(project => {
    project.name = deriveProjectName(project.id, Array.from(project.titles));
    project.conversationCount = project.conversations.length;
  });

  return projects;
};

/**
 * Validate conversation data structure
 */
export const validateConversation = (data: unknown): ParseError | null => {
  if (!data) {
    return { type: 'corrupted_data', message: 'Conversation data is null or undefined' };
  }

  if (typeof data !== 'object') {
    return { type: 'invalid_json', message: 'Conversation must be an object' };
  }

  if (!data.id) {
    return { type: 'missing_field', message: 'Conversation missing required field: id', conversationId: data.id };
  }

  if (!data.mapping || typeof data.mapping !== 'object') {
    return { type: 'missing_field', message: 'Conversation missing or invalid mapping field', conversationId: data.id };
  }

  return null;
};

/**
 * Parse JSON file content into ArchiveFile structure
 */
export const parseArchiveFile = (jsonContent: string, filePath: string): { data: ArchiveFile | null; errors: ParseError[] } => {
  const errors: ParseError[] = [];

  try {
    const rawData = JSON.parse(jsonContent);

    if (!Array.isArray(rawData)) {
      errors.push({ type: 'invalid_json', message: 'Root level must be an array of conversations' });
      return { data: null, errors };
    }

    const conversations: ProcessedConversation[] = [];
    const fileStats = {
      filePath,
      fileName: filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown',
      fileSize: jsonContent.length,
      lastModified: new Date(),
      conversations: [] as ProcessedConversation[],
      projects: {} as Record<string, Project>,
      totalConversations: 0,
      totalProjects: 0
    };

    rawData.forEach((rawConv: unknown, index: number) => {
      const validationError = validateConversation(rawConv);
      if (validationError) {
        errors.push(validationError);
        return;
      }

      try {
        const processedConv = processConversation(rawConv as Conversation, index);
        conversations.push(processedConv);
      } catch (error) {
        errors.push({
          type: 'corrupted_data',
          message: `Failed to process conversation: ${error}`,
          conversationId: typeof rawConv === 'object' && rawConv !== null && 'id' in rawConv ? String(rawConv.id) : undefined
        });
      }
    });

    const projects = groupConversationsByProjects(conversations);

    const archiveFile: ArchiveFile = {
      ...fileStats,
      conversations,
      projects,
      totalConversations: conversations.length,
      totalProjects: Object.keys(projects).length
    };

    return { data: archiveFile, errors };

  } catch (error) {
    errors.push({
      type: 'invalid_json',
      message: `JSON parsing failed: ${error}`
    });
    return { data: null, errors };
  }
};
