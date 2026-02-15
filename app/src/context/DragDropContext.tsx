import type { ReactNode, DragEvent, JSX } from 'react';
import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Data about the current drag hover target.
 */
export interface DragTarget {
  type: 'folder' | 'category' | 'area';
  id: number;
  name?: string;
}

/**
 * Context value for drag and drop operations.
 */
export interface DragDropContextValue {
  isDraggingFiles: boolean;
  dragData: DragTarget | null;
  handleDragEnter: (event: DragEvent) => void;
  handleDragLeave: (event: DragEvent) => void;
  handleDragOver: (event: DragEvent) => void;
  handleDrop: (event: DragEvent) => void;
  setHoverTarget: (target: DragTarget | null) => void;
  clearHoverTarget: () => void;
}

/**
 * Props for the DragDropProvider component.
 */
export interface DragDropProviderProps {
  children: ReactNode;
}

// ============================================
// CONTEXT
// ============================================

/**
 * DragDropContext
 * ================
 * Manages global drag & drop state for file organization.
 * Tracks when files are being dragged over the app and provides
 * state to DropZone components.
 */
const DragDropContext = createContext<DragDropContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export function DragDropProvider({ children }: DragDropProviderProps): JSX.Element {
  // Track if files are being dragged over the app
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Track the current drag data
  const [dragData, setDragData] = useState<DragTarget | null>(null);

  // Track drag counter (for nested elements)
  const [_dragCounter, setDragCounter] = useState(0);

  // Called when drag enters the app window
  const handleDragEnter = useCallback((event: DragEvent): void => {
    event.preventDefault();

    // Check if dragging files (not internal elements)
    if (event.dataTransfer.types.includes('Files')) {
      setDragCounter((prev) => {
        const newCount = prev + 1;
        if (newCount === 1) {
          setIsDraggingFiles(true);
        }
        return newCount;
      });
    }
  }, []);

  // Called when drag leaves the app window
  const handleDragLeave = useCallback((event: DragEvent): void => {
    event.preventDefault();

    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDraggingFiles(false);
        setDragData(null);
      }
      return Math.max(0, newCount);
    });
  }, []);

  // Called during drag over
  const handleDragOver = useCallback((event: DragEvent): void => {
    event.preventDefault();
    // Required to allow dropping
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Called when files are dropped (resets state)
  const handleDrop = useCallback((event: DragEvent): void => {
    event.preventDefault();
    setIsDraggingFiles(false);
    setDragData(null);
    setDragCounter(0);
  }, []);

  // Set data about what's being dragged over
  const setHoverTarget = useCallback((target: DragTarget | null): void => {
    setDragData(target);
  }, []);

  // Clear hover target
  const clearHoverTarget = useCallback((): void => {
    setDragData(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<DragDropContextValue>(
    () => ({
      isDraggingFiles,
      dragData,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      setHoverTarget,
      clearHoverTarget,
    }),
    [
      isDraggingFiles,
      dragData,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      setHoverTarget,
      clearHoverTarget,
    ]
  );

  return <DragDropContext.Provider value={value}>{children}</DragDropContext.Provider>;
}

// ============================================
// HOOK
// ============================================

// eslint-disable-next-line react-refresh/only-export-components
export function useDragDrop(): DragDropContextValue {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
}

export default DragDropContext;
