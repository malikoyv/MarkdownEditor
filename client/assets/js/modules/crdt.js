// Position identifier with logical clock and user ID
class Identifier {
    constructor(position, site) {
      this.position = position; // Logical position
      this.site = site;         // Unique site (user) ID
    }
    
    compareTo(other) {
      if (this.position !== other.position) {
        return this.position - other.position;
      }
      return this.site.localeCompare(other.site);
    }
  }
  
  // Character in the CRDT with a unique position and value
  class Char {
    constructor(value, pos, siteId) {
      this.value = value;
      this.identifier = new Identifier(pos, siteId);
    }
  }
  
  export class CRDT {
    constructor(userId) {
      this.userId = userId;
      this.clock = 0;
      this.operations = new Map();
    }

    generateId() {
      return `${this.userId}-${this.clock++}`;
    }

    insert(position, value) {
      const id = this.generateId();
      const operation = {
        type: 'insert',
        id,
        position,
        value,
        timestamp: Date.now()
      };
      this.operations.set(id, operation);
      return operation;
    }

    delete(position, length) {
      const id = this.generateId();
      const operation = {
        type: 'delete',
        id,
        position,
        length,
        timestamp: Date.now()
      };
      this.operations.set(id, operation);
      return operation;
    }

    applyOperation(operation) {
      if (this.operations.has(operation.id)) {
        return; // Already applied
      }

      this.operations.set(operation.id, operation);
      return operation;
    }

    transform(operation1, operation2) {
      if (operation1.type === 'insert' && operation2.type === 'insert') {
        if (operation1.position < operation2.position) {
          return operation1;
        } else if (operation1.position > operation2.position) {
          return {
            ...operation1,
            position: operation1.position + operation2.value.length
          };
        } else {
          // Same position, use timestamp to break tie
          return operation1.timestamp < operation2.timestamp ? operation1 : {
            ...operation1,
            position: operation1.position + operation2.value.length
          };
        }
      } else if (operation1.type === 'delete' && operation2.type === 'insert') {
        if (operation1.position < operation2.position) {
          return operation1;
        } else {
          return {
            ...operation1,
            position: operation1.position + operation2.value.length
          };
        }
      } else if (operation1.type === 'insert' && operation2.type === 'delete') {
        if (operation1.position <= operation2.position) {
          return operation1;
        } else if (operation1.position > operation2.position + operation2.length) {
          return {
            ...operation1,
            position: operation1.position - operation2.length
          };
        } else {
          // Operation is deleted
          return null;
        }
      } else if (operation1.type === 'delete' && operation2.type === 'delete') {
        if (operation1.position < operation2.position) {
          return operation1;
        } else if (operation1.position > operation2.position + operation2.length) {
          return {
            ...operation1,
            position: operation1.position - operation2.length
          };
        } else {
          // Overlapping deletes
          return null;
        }
      }
      return operation1;
    }

    merge(remoteOperations) {
      const mergedOperations = new Map();
      
      // Add all local operations
      for (const [id, operation] of this.operations) {
        mergedOperations.set(id, operation);
      }
      
      // Add and transform remote operations
      for (const [id, remoteOp] of remoteOperations) {
        if (!mergedOperations.has(id)) {
          let transformedOp = remoteOp;
          for (const [_, localOp] of this.operations) {
            transformedOp = this.transform(transformedOp, localOp);
            if (!transformedOp) break;
          }
          if (transformedOp) {
            mergedOperations.set(id, transformedOp);
          }
        }
      }
      
      return mergedOperations;
    }

    applyToContent(content) {
      const operations = Array.from(this.operations.values())
        .sort((a, b) => a.timestamp - b.timestamp);
      
      let result = content;
      for (const op of operations) {
        if (op.type === 'insert') {
          result = result.slice(0, op.position) + op.value + result.slice(op.position);
        } else if (op.type === 'delete') {
          result = result.slice(0, op.position) + result.slice(op.position + op.length);
        }
      }
      
      return result;
    }
  }