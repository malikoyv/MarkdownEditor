import { openDocument, getCurrentDocument } from './document.js'; // Import the openDocument and getCurrentDocument functions
import { isAuthenticated } from './auth.js';   // Import the isAuthenticated function

export const initUI = () => {
  const notifications = document.getElementById('notifications');
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      // Update active tab button
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Show the selected tab content
      const tabId = button.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Share button
  document.getElementById('shareBtn').addEventListener('click', () => {
    const currentDoc = getCurrentDocument();
    if (!currentDoc) return;
    
    // Create a shareable link
    const shareLink = `${window.location.origin}?doc=${currentDoc.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        showNotification('Link copied to clipboard', 'success');
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        showNotification('Failed to copy link', 'error');
      });
  });
  
  // Check for document ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get('doc');
  if (docId && isAuthenticated()) {
    // Try to open the document
    openDocument(docId);
  }
};

export const showNotification = (message, type = 'info') => {
  const notifications = document.getElementById('notifications');
  
  // Create notification element
  const notification = document.createElement('div');
  notification.classList.add('notification', `notification-${type}`);
  notification.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement('span');
  closeBtn.classList.add('notification-close');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    notification.remove();
  });
  
  notification.appendChild(closeBtn);
  notifications.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      if (notification.parentNode === notifications) {
        notifications.removeChild(notification);
      }
    }, 300);
  }, 5000);
};