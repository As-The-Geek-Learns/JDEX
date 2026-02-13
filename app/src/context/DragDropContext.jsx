import { createContext, useContext, useState, useCallback } from 'react';

/**
 * DragDropContext
 * ================
 * Manages global drag & drop state for file organization.
 * Tracks when files are being dragged over the app and provides
 * state to DropZone components.
 */

const DragDropContext = createContext(null);

export function DragDropProvider({ children }) {
  // Track if files are being dragged over the app
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Track the current drag data
  const [dragData, setDragData] = useState(null);

  // Track drag counter (for nested elements)
  const [_dragCounter, setDragCounter] = useState(0);

  // Called when drag enters the app window
  const handleDragEnter = useCallback((event) => {
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
  const handleDragLeave = useCallback((event) => {
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
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    // Required to allow dropping
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Called when files are dropped (resets state)
  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDraggingFiles(false);
    setDragData(null);
    setDragCounter(0);
  }, []);

  // Set data about what's being dragged over
  const setHoverTarget = useCallback((target) => {
    setDragData(target);
  }, []);

  // Clear hover target
  const clearHoverTarget = useCallback(() => {
    setDragData(null);
  }, []);

  const value = {
    isDraggingFiles,
    dragData,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    setHoverTarget,
    clearHoverTarget,
  };

  return <DragDropContext.Provider value={value}>{children}</DragDropContext.Provider>;
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
}

export default DragDropContext;
