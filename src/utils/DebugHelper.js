/**
 * Debug helper class for troubleshooting model loading and other issues
 */
export class DebugHelper {
    constructor() {
        this.isDebugMode = true;
        this.modelLoadingStatus = {};
        this.errors = [];
        
        // Add a flag to control verbosity of info logs
        this.verboseLogging = false;
        
        // Create debug overlay if in debug mode
        if (this.isDebugMode) {
            this.createDebugOverlay();
        }
    }
    
    /**
     * Create a debug overlay on the screen
     */
    createDebugOverlay() {
        // Create the debug container if it doesn't exist
        if (!document.getElementById('debug-overlay')) {
            const debugOverlay = document.createElement('div');
            debugOverlay.id = 'debug-overlay';
            debugOverlay.style.position = 'fixed';
            debugOverlay.style.bottom = '10px';
            debugOverlay.style.left = '10px';
            debugOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            debugOverlay.style.color = '#0f0';
            debugOverlay.style.padding = '10px';
            debugOverlay.style.borderRadius = '5px';
            debugOverlay.style.fontFamily = 'monospace';
            debugOverlay.style.fontSize = '12px';
            debugOverlay.style.maxWidth = '600px';
            debugOverlay.style.maxHeight = '200px';
            debugOverlay.style.overflow = 'auto';
            debugOverlay.style.zIndex = '1000';
            debugOverlay.style.display = 'none'; // Hide initially
            
            // Add toggle button
            const toggleButton = document.createElement('button');
            toggleButton.textContent = 'Show Debug';
            toggleButton.style.position = 'fixed';
            toggleButton.style.bottom = '10px';
            toggleButton.style.left = '10px';
            toggleButton.style.zIndex = '1001';
            toggleButton.style.padding = '5px 10px';
            toggleButton.style.backgroundColor = '#333';
            toggleButton.style.color = '#fff';
            toggleButton.style.border = 'none';
            toggleButton.style.borderRadius = '3px';
            toggleButton.style.cursor = 'pointer';
            
            toggleButton.addEventListener('click', () => {
                if (debugOverlay.style.display === 'none') {
                    debugOverlay.style.display = 'block';
                    toggleButton.textContent = 'Hide Debug';
                } else {
                    debugOverlay.style.display = 'none';
                    toggleButton.textContent = 'Show Debug';
                }
            });
            
            document.body.appendChild(toggleButton);
            document.body.appendChild(debugOverlay);
        }
    }
    
    /**
     * Log a message to both console and debug overlay
     * @param {string} message - The message to log
     * @param {string} type - The type of message (info, warn, error)
     */
    log(message, type = 'info') {
        // Filter out less important info logs when not in verbose mode
        if (type === 'info' && !this.verboseLogging) {
            // Check if this is an important message we want to keep
            const isImportantMessage = 
                // Keep initialization and loading messages
                message.includes('initialized') || 
                message.includes('loaded successfully') ||
                // Keep error and warning related messages
                message.includes('error') || 
                message.includes('failed') ||
                message.includes('warning') ||
                // Keep game state changes
                message.includes('Game Over') ||
                message.includes('Level complete');
                
            // Skip non-important info logs
            if (!isImportantMessage) {
                return;
            }
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${message}`;
        
        // Log to console based on type
        switch (type) {
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'error':
                console.error(formattedMessage);
                this.errors.push(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
        
        // Add to debug overlay if it exists
        if (this.isDebugMode) {
            const debugOverlay = document.getElementById('debug-overlay');
            if (debugOverlay) {
                const messageElement = document.createElement('div');
                messageElement.textContent = formattedMessage;
                
                // Style based on type
                switch (type) {
                    case 'warn':
                        messageElement.style.color = '#ff9900';
                        break;
                    case 'error':
                        messageElement.style.color = '#ff3333';
                        break;
                    default:
                        messageElement.style.color = '#00ff00';
                }
                
                debugOverlay.appendChild(messageElement);
                
                // Auto-scroll to bottom
                debugOverlay.scrollTop = debugOverlay.scrollHeight;
                
                // Limit the number of messages to avoid performance issues
                while (debugOverlay.childNodes.length > 50) {
                    debugOverlay.removeChild(debugOverlay.firstChild);
                }
            }
        }
    }
    
    /**
     * Track the loading status of a model
     * @param {string} modelId - Identifier for the model
     * @param {string} status - Current status (loading, loaded, error)
     * @param {string} details - Additional details or error message
     */
    trackModelLoading(modelId, status, details = '') {
        this.modelLoadingStatus[modelId] = {
            status,
            details,
            timestamp: Date.now()
        };
        
        // Only log errors and successful loads
        if (status === 'error' || (status === 'loaded' && this.verboseLogging)) {
            const statusMessage = `Model ${modelId}: ${status}${details ? ' - ' + details : ''}`;
            const messageType = status === 'error' ? 'error' : 'info';
            this.log(statusMessage, messageType);
        }
    }
    
    /**
     * Get a summary of all model loading statuses
     * @returns {string} A formatted summary of model loading status
     */
    getModelLoadingSummary() {
        let summary = 'MODEL LOADING SUMMARY:\n';
        
        for (const [modelId, status] of Object.entries(this.modelLoadingStatus)) {
            summary += `- ${modelId}: ${status.status}`;
            if (status.details) {
                summary += ` (${status.details})`;
            }
            summary += '\n';
        }
        
        return summary;
    }
}

// Create a singleton instance
const debugHelper = new DebugHelper();
export default debugHelper; 