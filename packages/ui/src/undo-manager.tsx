/**
 * Undo/Redo Manager for Writing Assistant
 * Manages history stack for undo/redo operations
 */

import { create } from 'zustand';

interface HistoryState {
  text: string;
  timestamp: number;
}

interface UndoRedoState {
  history: HistoryState[];
  currentIndex: number;
  maxSize: number;
  
  canUndo: boolean;
  canRedo: boolean;
  
  pushState: (text: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  clear: () => void;
  getCurrentState: () => string | null;
}

export const useUndoRedo = create<UndoRedoState>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxSize: 50,
  
  get canUndo() {
    return get().currentIndex > 0;
  },
  
  get canRedo() {
    return get().currentIndex < get().history.length - 1;
  },
  
  pushState: (text: string) => {
    const { history, currentIndex, maxSize } = get();
    
    // Remove any states after current index (new branch)
    const newHistory = history.slice(0, currentIndex + 1);
    
    // Add new state
    newHistory.push({
      text,
      timestamp: Date.now(),
    });
    
    // Enforce max size
    if (newHistory.length > maxSize) {
      newHistory.shift();
    } else {
      // Update index
      set({ currentIndex: newHistory.length - 1 });
    }
    
    set({ history: newHistory });
  },
  
  undo: () => {
    const { currentIndex, history } = get();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      set({ currentIndex: newIndex });
      return history[newIndex].text;
    }
    return null;
  },
  
  redo: () => {
    const { currentIndex, history } = get();
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      set({ currentIndex: newIndex });
      return history[newIndex].text;
    }
    return null;
  },
  
  clear: () => {
    set({ history: [], currentIndex: -1 });
  },
  
  getCurrentState: () => {
    const { currentIndex, history } = get();
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex].text;
    }
    return null;
  },
}));

/**
 * React hook for keyboard shortcuts
 */
export function useKeyboardUndoRedo(onUndo: () => void, onRedo: () => void) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
      
      // Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo();
      }
      
      // Ctrl+Y or Cmd+Y for redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        onRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo]);
}

import React from 'react';

/**
 * Undo/Redo Button Component
 */
export function UndoRedoButtons() {
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  
  const handleUndo = () => {
    undo();
  };
  
  const handleRedo = () => {
    redo();
  };
  
  useKeyboardUndoRedo(handleUndo, handleRedo);
  
  return (
    <div className="flex gap-2">
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>
      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
        title="Redo (Ctrl+Y)"
      >
        ↷ Redo
      </button>
    </div>
  );
}

/**
 * History List Component
 */
export function HistoryList() {
  const { history, currentIndex, undo } = useUndoRedo();
  
  const handleJumpToState = (index: number) => {
    while (useUndoRedo.getState().currentIndex > index) {
      undo();
    }
  };
  
  return (
    <div className="border rounded p-2 max-h-64 overflow-y-auto">
      <h3 className="font-semibold mb-2">History</h3>
      <ul className="space-y-1">
        {history.map((state, index) => (
          <li
            key={index}
            onClick={() => handleJumpToState(index)}
            className={`p-2 rounded cursor-pointer transition-colors ${
              index === currentIndex
                ? 'bg-blue-100 border-blue-500 border'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="text-sm">
              {index === currentIndex ? 'Current' : `State ${index}`}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(state.timestamp).toLocaleTimeString()}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {state.text.slice(0, 50)}...
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
