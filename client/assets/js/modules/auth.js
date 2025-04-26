import { showNotification } from './ui.js';

let currentUser = null;
const AUTH_TOKEN_KEY = 'auth_token';
const USERS_STORAGE_KEY = 'registered_users';

export const initAuth = () => {
  const loginContainer = document.getElementById('loginContainer');
  const userInfo = document.getElementById('userInfo');
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  const closeModal = document.querySelector('.close-modal');
  
  // Ensure default user exists for testing purposes
  initializeDefaultUser();
  
  // Check if user is already logged in
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    try {
      const userData = JSON.parse(atob(token.split('.')[1]));
      currentUser = userData;
      renderUserUI();
    } catch (e) {
      // Invalid token
      console.error('Auth error:', e);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      renderAuthButton();
    }
  } else {
    renderAuthButton();
  }
  
  // Create login form HTML
  function createAuthModalContent() {
    // Create HTML for login/register tabs and forms
    return `
      <div class="tabs">
        <button class="tab-btn active" data-tab="loginTab">Login</button>
        <button class="tab-btn" data-tab="registerTab">Register</button>
      </div>
      
      <div id="loginTab" class="tab-content active">
        <form id="loginForm">
          <div class="form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" required>
          </div>
          <div class="form-group">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" required>
          </div>
          <button type="submit" class="btn btn-primary">Login</button>
        </form>
      </div>
      
      <div id="registerTab" class="tab-content">
        <form id="registerForm">
          <div class="form-group">
            <label for="registerName">Name</label>
            <input type="text" id="registerName" required>
          </div>
          <div class="form-group">
            <label for="registerEmail">Email</label>
            <input type="email" id="registerEmail" required>
          </div>
          <div class="form-group">
            <label for="registerPassword">Password</label>
            <input type="password" id="registerPassword" required>
          </div>
          <div class="form-group">
            <label for="registerConfirmPassword">Confirm Password</label>
            <input type="password" id="registerConfirmPassword" required>
          </div>
          <button type="submit" class="btn btn-primary">Register</button>
        </form>
      </div>
    `;
  }
  
  // Setup listeners for modal elements
  function setupAuthModalListeners() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons.length > 0) {
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          tabButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          
          const tabContents = document.querySelectorAll('.tab-content');
          tabContents.forEach(content => content.classList.remove('active'));
          
          const tabId = button.getAttribute('data-tab');
          document.getElementById(tabId).classList.add('active');
        });
      });
    }
    
    // Close modal
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        if (modal) modal.classList.remove('visible');
      });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (login(email, password)) {
          if (modal) modal.classList.remove('visible');
          renderUserUI();
          showNotification('Login successful!', 'success');
        } else {
          showNotification('Invalid email or password', 'error');
        }
      });
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        if (password !== confirmPassword) {
          showNotification('Passwords do not match', 'error');
          return;
        }
        
        try {
          register(name, email, password);
          if (modal) modal.classList.remove('visible');
          renderUserUI();
          showNotification('Registration successful!', 'success');
        } catch (error) {
          showNotification(error.message, 'error');
        }
      });
    }
  }
  
  function openAuthModal() {
    if (modalContent) {
      modalContent.innerHTML = createAuthModalContent();
      if (modal) modal.classList.add('visible');
      setupAuthModalListeners();
    }
  }
  
  function renderAuthButton() {
    if (loginContainer) {
      loginContainer.innerHTML = `
        <button id="loginBtn" class="btn btn-outline">Login / Register</button>
      `;
      
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', openAuthModal);
      }
    }
  }
  
  function renderUserUI() {
    if (loginContainer && userInfo) {
      loginContainer.classList.add('hidden');
      userInfo.classList.remove('hidden');
      
      const userName = document.getElementById('userName');
      if (userName) {
        userName.textContent = currentUser.name;
      }
      
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          logout();
          userInfo.classList.add('hidden');
          loginContainer.classList.remove('hidden');
          renderAuthButton();
          showNotification('Logged out successfully', 'info');
        });
      }
      
      // Publish a custom event to notify other modules
      const event = new CustomEvent('user:login', { detail: currentUser });
      document.dispatchEvent(event);
    }
  }
};

// Initialize a default test user if none exists
function initializeDefaultUser() {
  const users = getRegisteredUsers();
  if (users.length === 0) {
    const testUser = {
      id: 'user_default',
      name: 'Test User',
      email: 'test@example.com',
      password: hashPassword('password')
    };
    users.push(testUser);
    saveRegisteredUsers(users);
    console.log('Default test user created: test@example.com / password');
  }
}

function getRegisteredUsers() {
  const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
}

function saveRegisteredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function register(name, email, password) {
  const users = getRegisteredUsers();
  
  // Check if email already exists
  if (users.some(user => user.email === email)) {
    throw new Error('Email already registered');
  }
  
  // Create new user
  const userId = `user_${Date.now()}`;
  const newUser = { id: userId, name, email, password: hashPassword(password) };
  users.push(newUser);
  saveRegisteredUsers(users);
  
  // Auto login after registration
  login(email, password);
  
  return true;
}

function login(email, password) {
  const users = getRegisteredUsers();
  const user = users.find(u => u.email === email && u.password === hashPassword(password));
  
  if (user) {
    // Create a simple JWT-like token
    const payload = { id: user.id, name: user.name, email: user.email };
    const token = `mock.${btoa(JSON.stringify(payload))}.token`;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    currentUser = payload;
    return true;
  }
  
  return false;
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  currentUser = null;
  
  // Publish a custom event to notify other modules
  const event = new CustomEvent('user:logout');
  document.dispatchEvent(event);
}

function hashPassword(password) {
  // This is a simple hash for mock auth - DO NOT use in production!
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export const getCurrentUser = () => currentUser;
export const isAuthenticated = () => !!currentUser;