/**
 * Event system for game-wide communication
 * Allows components to communicate without direct references
 */
export class EventSystem {
    constructor() {
        this.listeners = new Map();
    }
    
    /**
     * Register a listener for an event
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when event is dispatched
     * @returns {Function} Function to call to remove the listener
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        
        this.listeners.get(eventName).add(callback);
        
        // Return a function to remove this listener
        return () => this.off(eventName, callback);
    }
    
    /**
     * Remove a listener for an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to remove
     */
    off(eventName, callback) {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).delete(callback);
            
            // Clean up empty event lists
            if (this.listeners.get(eventName).size === 0) {
                this.listeners.delete(eventName);
            }
        }
    }
    
    /**
     * Dispatch an event to all listeners
     * @param {string} eventName - Name of the event to dispatch
     * @param {any} data - Data to pass to listeners
     */
    emit(eventName, data) {
        if (this.listeners.has(eventName)) {
            // Create a copy of the listeners to avoid issues if listeners are added/removed during dispatch
            const callbacks = Array.from(this.listeners.get(eventName));
            
            for (const callback of callbacks) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            }
        }
    }
    
    /**
     * Remove all listeners for an event or all events
     * @param {string} [eventName] - Optional event name, if not provided all events will be cleared
     */
    clear(eventName) {
        if (eventName) {
            this.listeners.delete(eventName);
        } else {
            this.listeners.clear();
        }
    }
}

// Singleton instance for global events
export const gameEvents = new EventSystem();

// Define standard event names to avoid string typos
export const GameEvents = {
    // Game state events
    GAME_INIT: 'game:init',
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    
    // Player events
    PLAYER_SPAWN: 'player:spawn',
    PLAYER_HIT: 'player:hit',
    PLAYER_DEATH: 'player:death',
    PLAYER_RESPAWN: 'player:respawn',
    PLAYER_SHOOT: 'player:shoot',
    
    // Enemy events
    ENEMY_SPAWN: 'enemy:spawn',
    ENEMY_HIT: 'enemy:hit',
    ENEMY_DESTROYED: 'enemy:destroyed',
    
    // Weapon events
    WEAPON_FIRED: 'weapon:fired',
    WEAPON_HIT: 'weapon:hit',
    
    // Powerup events
    POWERUP_SPAWN: 'powerup:spawn',
    POWERUP_COLLECTED: 'powerup:collected',
    
    // Level events
    LEVEL_START: 'level:start',
    LEVEL_COMPLETE: 'level:complete',
    LEVEL_FAILED: 'level:failed',
    CHECKPOINT_REACHED: 'level:checkpoint',
    
    // UI events
    SCORE_CHANGED: 'ui:score',
    LIVES_CHANGED: 'ui:lives',
    SHOW_MESSAGE: 'ui:message',
}; 