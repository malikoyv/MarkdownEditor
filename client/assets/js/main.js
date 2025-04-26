import { initAuth, isAuthenticated } from './modules/auth.js';
import { initDocuments } from './modules/document.js'; // Changed from documents.js to document.js
import { initEditor } from './modules/editor.js';
import { initSync } from './modules/sync.js';
import { initUI } from './modules/ui.js';
import { initOffline } from './modules/offline.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize app components
  initUI();
  initAuth();
  
  // Wait for auth to be ready before initializing documents
  if (isAuthenticated()) {
    initDocuments();
  }
  
  initEditor();
  initSync();
  initOffline();
  
  // Check for stored language preference
  const currentLang = localStorage.getItem('language') || 'en';
  setLanguage(currentLang);
});

// Language switcher
const setLanguage = async (lang) => {
  try {
    const response = await fetch(`assets/i18n/${lang}.json`);
    const translations = await response.json();
    
    // Find all elements with data-i18n attribute and replace their text
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (translations[key]) {
        element.textContent = translations[key];
      }
    });
    
    localStorage.setItem('language', lang);
  } catch (error) {
    console.error('Error loading translations:', error);
  }
};

// Expose language switcher for global access
window.setLanguage = setLanguage;
