// File reading utilities for ChatGPT Archive Reader
// Platform abstraction layer for web and desktop file access

import { ArchiveFile, ParseError } from '@/lib/types';
import { parseArchiveFile } from './conversation-utils';

/**
 * File reading result
 */
export interface FileReadResult {
  success: boolean;
  data?: ArchiveFile;
  errors: ParseError[];
  errorMessage?: string;
}

/**
 * Web-based file reading using File System Access API
 */
export const readFileWeb = async (file: File): Promise<FileReadResult> => {
  try {
    const text = await file.text();
    const { data, errors } = parseArchiveFile(text, file.name);

    return {
      success: data !== null,
      data: data || undefined,
      errors,
      errorMessage: data ? undefined : 'Failed to parse archive file'
    };
  } catch (error) {
    return {
      success: false,
      errors: [],
      errorMessage: `Failed to read file: ${error}`
    };
  }
};

/**
 * Desktop file reading (for Tauri - placeholder for now)
 * This will be implemented when we add Tauri support
 */
export const readFileDesktop = async (): Promise<FileReadResult> => {
  // Placeholder for Tauri implementation
  // Will use Tauri's fs API when implemented
  return {
    success: false,
    errors: [],
    errorMessage: 'Desktop file reading not yet implemented'
  };
};

/**
 * Generic file reading function that detects platform
 * In web mode, returns a file picker promise
 * In desktop mode, will read from path
 */
export const readArchiveFile = async (file?: File | string): Promise<FileReadResult> => {
  // Web mode - file picker
  if (file instanceof File) {
    return readFileWeb(file);
  }

  // Web mode - trigger file picker if no file provided
  if (!file) {
    try {
      const fileHandles = await (window as unknown as { showOpenFilePicker: (options: unknown) => Promise<unknown[]> }).showOpenFilePicker({
        types: [{
          description: 'ChatGPT Archive Files',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });

      if (fileHandles && fileHandles.length > 0) {
        const fileHandle = fileHandles[0];
        const file = await fileHandle.getFile();
        return readFileWeb(file);
      }
    } catch (error) {
      // User cancelled file picker or API not supported
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          errors: [],
          errorMessage: 'File selection cancelled'
        };
      }

      // Fallback for browsers without File System Access API
      return {
        success: false,
        errors: [],
        errorMessage: 'File System Access API not supported. Please use a modern browser or drag and drop files.'
      };
    }
  }

  // Desktop mode (string path) - not implemented yet
  if (typeof file === 'string') {
    return readFileDesktop(file);
  }

  return {
    success: false,
    errors: [],
    errorMessage: 'Invalid file parameter'
  };
};

/**
 * Check if File System Access API is supported
 */
export const isFileSystemAccessSupported = (): boolean => {
  return 'showOpenFilePicker' in window;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate file before reading
 */
export const validateArchiveFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.name.toLowerCase().endsWith('.json')) {
    return { valid: false, error: 'File must be a JSON file (.json extension)' };
  }

  // Check file size (warn for very large files)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    return { valid: false, error: `File too large (${formatFileSize(file.size)}). Maximum supported size is ${formatFileSize(maxSize)}.` };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
};
