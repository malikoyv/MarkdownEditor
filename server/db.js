// This is a simple in-memory database implementation for demo purposes
// In a real application, you would use a proper database like MongoDB or PostgreSQL

class Database {
    constructor() {
      this.collections = {};
    }
    
    // Create a collection
    createCollection(name) {
      if (this.collections[name]) {
        throw new Error(`Collection ${name} already exists`);
      }
      
      this.collections[name] = new Map();
      return this.collections[name];
    }
    
    // Get a collection
    getCollection(name) {
      if (!this.collections[name]) {
        this.createCollection(name);
      }
      
      return this.collections[name];
    }
    
    // Insert a document into a collection
    async insert(collectionName, document) {
      const collection = this.getCollection(collectionName);
      
      if (!document._id) {
        document._id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      }
      
      collection.set(document._id, document);
      return document;
    }
    
    // Find documents in a collection
    async find(collectionName, query = {}) {
      const collection = this.getCollection(collectionName);
      const results = [];
      
      for (const document of collection.values()) {
        let matches = true;
        
        for (const key in query) {
          if (document[key] !== query[key]) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          results.push(document);
        }
      }
      
      return results;
    }
    
    // Find one document in a collection
    async findOne(collectionName, query = {}) {
      const results = await this.find(collectionName, query);
      return results.length > 0 ? results[0] : null;
    }
    
    // Update a document in a collection
    async update(collectionName, query, updates) {
      const collection = this.getCollection(collectionName);
      const matches = await this.find(collectionName, query);
      const updatedDocs = [];
      
      for (const doc of matches) {
        const updatedDoc = { ...doc, ...updates };
        collection.set(doc._id, updatedDoc);
        updatedDocs.push(updatedDoc);
      }
      
      return updatedDocs;
    }
    
    // Delete documents from a collection
    async delete(collectionName, query) {
      const collection = this.getCollection(collectionName);
      const matches = await this.find(collectionName, query);
      
      for (const doc of matches) {
        collection.delete(doc._id);
      }
      
      return matches.length;
    }
  }
  
  // Create a singleton instance
  const db = new Database();
  
  module.exports = db;