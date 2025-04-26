export function initAccessibility() {
  // Add ARIA roles and labels
  const editor = document.getElementById('editor');
  if (editor) {
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-label', 'Document editor');
    editor.setAttribute('aria-multiline', 'true');
  }

  const documentList = document.getElementById('documentList');
  if (documentList) {
    documentList.setAttribute('role', 'list');
    documentList.setAttribute('aria-label', 'Document list');
  }

  // Add keyboard navigation
  document.addEventListener('keydown', handleKeyboardNavigation);
}

function handleKeyboardNavigation(event) {
  const target = event.target;
  
  // Skip if target is an input or textarea
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return;
  }

  switch (event.key) {
    case 'Tab':
      // Ensure focus stays within the app
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          event.preventDefault();
        }
      }
      break;

    case 'Enter':
      if (target.getAttribute('role') === 'button') {
        target.click();
      }
      break;

    case 'Escape':
      // Close any open modals or dropdowns
      const modals = document.querySelectorAll('[role="dialog"]');
      modals.forEach(modal => {
        if (modal.style.display !== 'none') {
          modal.style.display = 'none';
          modal.setAttribute('aria-hidden', 'true');
        }
      });
      break;
  }
}

export function updateLiveRegion(message) {
  let liveRegion = document.getElementById('liveRegion');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'liveRegion';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.padding = '0';
    liveRegion.style.margin = '-1px';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.border = '0';
    document.body.appendChild(liveRegion);
  }
  
  liveRegion.textContent = message;
}

export function announceDocumentStatus(document) {
  const message = document
    ? `Document "${document.title}" loaded`
    : 'No document selected';
  updateLiveRegion(message);
}

export function announceSaveStatus(success) {
  const message = success
    ? 'Document saved successfully'
    : 'Error saving document';
  updateLiveRegion(message);
}

export function announceUserStatus(user, action) {
  const message = user
    ? `${user.name} ${action} the document`
    : 'User status unknown';
  updateLiveRegion(message);
}

// Add focus management
export function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          event.preventDefault();
        }
      }
    }
  });
} 