const MAX_HISTORY_LENGTH = 100;

export class History {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.currentState = null;
  }

  pushState(state) {
    if (this.currentState) {
      this.undoStack.push(this.currentState);
      
      // Limit history length
      if (this.undoStack.length > MAX_HISTORY_LENGTH) {
        this.undoStack.shift();
      }
    }
    
    this.currentState = state;
    this.redoStack = []; // Clear redo stack when new state is pushed
  }

  undo() {
    if (this.undoStack.length === 0) {
      return null;
    }
    
    const previousState = this.undoStack.pop();
    if (this.currentState) {
      this.redoStack.push(this.currentState);
    }
    
    this.currentState = previousState;
    return previousState;
  }

  redo() {
    if (this.redoStack.length === 0) {
      return null;
    }
    
    const nextState = this.redoStack.pop();
    if (this.currentState) {
      this.undoStack.push(this.currentState);
    }
    
    this.currentState = nextState;
    return nextState;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.currentState = null;
  }
}

// Create a singleton instance
export const history = new History();

export function recordChange(content) {
  history.pushState({
    content,
    timestamp: Date.now()
  });
}

export function initHistory() {
  // Listen for document changes
  document.addEventListener('editor:contentChange', (event) => {
    recordChange(event.detail.content);
  });

  // Listen for undo/redo events
  document.addEventListener('history:undo', (event) => {
    const state = history.undo();
    if (state) {
      document.dispatchEvent(new CustomEvent('editor:contentUpdate', {
        detail: { content: state.content }
      }));
    }
  });

  document.addEventListener('history:redo', (event) => {
    const state = history.redo();
    if (state) {
      document.dispatchEvent(new CustomEvent('editor:contentUpdate', {
        detail: { content: state.content }
      }));
    }
  });

  // Keyboard shortcuts for undo/redo
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z') {
        if (event.shiftKey) {
          // Redo
          const state = history.redo();
          if (state) {
            event.preventDefault();
            document.dispatchEvent(new CustomEvent('history:redo', { detail: state }));
          }
        } else {
          // Undo
          const state = history.undo();
          if (state) {
            event.preventDefault();
            document.dispatchEvent(new CustomEvent('history:undo', { detail: state }));
          }
        }
      }
    }
  });
}