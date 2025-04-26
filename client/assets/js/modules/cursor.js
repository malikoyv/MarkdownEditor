import { getCurrentUser } from './auth.js';

const CURSOR_TIMEOUT = 5000;
let cursorTimers = {};

export const updateCursorPosition = (position) => {
  const user = getCurrentUser();
  if (!user) return;
  
  document.dispatchEvent(new CustomEvent('cursor:change', {
    detail: { position, user }
  }));
};

export const trackSelections = (e) => {
  const textarea = e.target;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  if (start === end) return; // No selection, just cursor
  
  const user = getCurrentUser();
  if (!user) return;
  
  document.dispatchEvent(new CustomEvent('cursor:selection', {
    detail: { start, end, user }
  }));
};

export const showCursor = (position, user) => {
  const textarea = document.getElementById('markdownEditor');
  const editorContainer = textarea.parentElement;
  
  // Remove existing cursor for this user
  removeCursor(user.id);
  
  // Create cursor element
  const cursor = document.createElement('div');
  cursor.classList.add('remote-cursor');
  cursor.id = `cursor-${user.id}`;
  cursor.style.backgroundColor = getUserColor(user.id);
  
  // Position cursor
  const textBeforeCursor = textarea.value.substring(0, position);
  const lines = textBeforeCursor.split('\n');
  const lineIndex = lines.length - 1;
  const charIndex = lines[lineIndex].length;
  
  // Calculate position
  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
  const paddingLeft = parseInt(getComputedStyle(textarea).paddingLeft);
  const charWidth = 8; // Approximate width of a character
  
  cursor.style.top = `${(lineIndex * lineHeight) + 4}px`;
  cursor.style.left = `${(charIndex * charWidth) + paddingLeft}px`;
  
  // Add user label
  const label = document.createElement('span');
  label.classList.add('cursor-label');
  label.textContent = user.name;
  label.style.backgroundColor = getUserColor(user.id);
  cursor.appendChild(label);
  
  // Add to editor
  editorContainer.appendChild(cursor);
  
  // Set timeout to remove cursor after inactivity
  if (cursorTimers[user.id]) {
    clearTimeout(cursorTimers[user.id]);
  }
  
  cursorTimers[user.id] = setTimeout(() => {
    removeCursor(user.id);
  }, CURSOR_TIMEOUT);
};

export const removeCursor = (userId) => {
  const cursor = document.getElementById(`cursor-${userId}`);
  if (cursor) {
    cursor.remove();
  }
  
  if (cursorTimers[userId]) {
    clearTimeout(cursorTimers[userId]);
    delete cursorTimers[userId];
  }
};

function getUserColor(userId) {
  // Generate a consistent color for a user based on their ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#DFBBB1', '#F7B32B', '#2D7DD2'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}