/**
 * Generic object pool for efficient reuse of frequently created/destroyed objects
 * Helps reduce garbage collection pauses for objects like missiles, explosions, etc.
 */
export class ObjectPool {
    /**
     * Create a new object pool
     * @param {Function} factory - Factory function that creates new objects
     * @param {Function} reset - Function to reset object to initial state
     * @param {number} initialSize - Initial size of the pool
     */
    constructor(factory, reset, initialSize = 20) {
        this.factory = factory;
        this.reset = reset;
        this.active = new Set();
        this.inactive = [];
        
        // Initialize pool with inactive objects
        for (let i = 0; i < initialSize; i++) {
            this.inactive.push(this.factory());
        }
    }
    
    /**
     * Get an object from the pool or create a new one if none available
     * @returns {Object} An object ready to use
     */
    get() {
        let object;
        
        if (this.inactive.length > 0) {
            // Get existing object from pool
            object = this.inactive.pop();
        } else {
            // Create new object if pool is empty
            object = this.factory();
        }
        
        // Add to active set
        this.active.add(object);
        
        return object;
    }
    
    /**
     * Return an object to the pool
     * @param {Object} object - The object to release back to the pool
     */
    release(object) {
        if (this.active.has(object)) {
            // Remove from active set
            this.active.delete(object);
            
            // Reset object state
            this.reset(object);
            
            // Add to inactive array
            this.inactive.push(object);
        }
    }
    
    /**
     * Get count of active objects
     * @returns {number} Number of active objects
     */
    getActiveCount() {
        return this.active.size;
    }
    
    /**
     * Get count of inactive objects
     * @returns {number} Number of inactive objects
     */
    getInactiveCount() {
        return this.inactive.length;
    }
    
    /**
     * Clear all objects from the pool
     */
    clear() {
        this.active.clear();
        this.inactive = [];
    }
} 