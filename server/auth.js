const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// In a real application, this would be stored in a secure environment variable
const JWT_SECRET = 'your-secret-key';  // NEVER hardcode this in production

// In-memory user store for demo purposes
// In a real app, you would use a database
const users = new Map();

// Register a new user
function registerUser(username, email, password) {
  // Check if email is already registered
  for (const user of users.values()) {
    if (user.email === email) {
      throw new Error('Email already registered');
    }
  }
  
  // Hash the password
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  
  // Create user ID
  const userId = `user_${Date.now()}`;
  
  // Create user object
  const user = {
    id: userId,
    username,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date()
  };
  
  // Store user
  users.set(userId, user);
  
  return {
    id: user.id,
    username: user.username,
    email: user.email
  };
}

// Authenticate user
function authenticateUser(email, password) {
  // Find user by email
  let user = null;
  for (const u of users.values()) {
    if (u.email === email) {
      user = u;
      break;
    }
  }
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Verify password
  const hash = crypto.pbkdf2Sync(password, user.passwordSalt, 1000, 64, 'sha512').toString('hex');
  if (hash !== user.passwordHash) {
    throw new Error('Invalid email or password');
  }
  
  // Generate JWT token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    token
  };
}

// Verify JWT token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Get user by ID
function getUserById(userId) {
  const user = users.get(userId);
  if (!user) {
    return null;
  }
  
  return {
    id: user.id,
    username: user.username,
    email: user.email
  };
}

module.exports = {
  registerUser,
  authenticateUser,
  verifyToken,
  getUserById
};