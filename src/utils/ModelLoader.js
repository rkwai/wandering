import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Utility class for loading and managing 3D models in the game
 */
export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.models = new Map(); // Cache for loaded models
        this.loadingManager = new THREE.LoadingManager();
        
        // Setup loading manager events
        this.loadingManager.onProgress = (url, loaded, total) => {
            console.log(`Loading model: ${url} (${Math.round(loaded / total * 100)}%)`);
        };
        
        this.loadingManager.onError = (url) => {
            console.error(`Error loading model: ${url}`);
        };
        
        this.loader.manager = this.loadingManager;
    }
    
    /**
     * Load a GLB/GLTF model from the assets directory
     * 
     * @param {string} modelPath - Path to the model relative to the assets directory
     * @param {Function} onLoad - Callback when model is loaded with the model as parameter
     * @param {Function} onError - Callback when model fails to load with the error as parameter
     * @param {boolean} cache - Whether to cache the model for future use (default: true)
     */
    loadModel(modelPath, onLoad, onError, cache = true) {
        // Check if the model is already cached
        if (cache && this.models.has(modelPath)) {
            const cachedModel = this.models.get(modelPath).clone();
            if (onLoad) onLoad(cachedModel);
            return;
        }
        
        // Format the path correctly with proper handling of various input formats
        let fullPath = modelPath;
        let alternativePaths = [];
        
        // If the path doesn't have /assets or public/assets, add it
        if (!modelPath.includes('/assets/')) {
            // First try: Check if it starts with 'models/'
            if (modelPath.startsWith('models/')) {
                fullPath = `/assets/${modelPath}`;
                alternativePaths.push(fullPath);
                alternativePaths.push(`/public/assets/${modelPath}`);
                alternativePaths.push(modelPath); // Try the original path too
            } else {
                // File name only - try different directories
                const filename = modelPath.split('/').pop();
                
                // Try specific subdirectories based on file patterns
                if (filename.startsWith('spaceship') || filename.startsWith('missile')) {
                    alternativePaths.push(`/assets/models/spaceships/${filename}`);
                    alternativePaths.push(`/public/assets/models/spaceships/${filename}`);
                } else if (filename.startsWith('asteroid')) {
                    alternativePaths.push(`/assets/models/asteroids/${filename}`);
                    alternativePaths.push(`/public/assets/models/asteroids/${filename}`);
                } else if (filename.startsWith('planet')) {
                    alternativePaths.push(`/assets/models/environment/${filename}`);
                    alternativePaths.push(`/public/assets/models/environment/${filename}`);
                }
                
                // Also try the root models directory
                alternativePaths.push(`/assets/models/${filename}`);
                alternativePaths.push(`/public/assets/models/${filename}`);
                fullPath = alternativePaths[0]; // Use first alternative as the primary path
            }
        }
        
        console.log(`Loading model from path: ${fullPath}`);
        
        // Try loading with the first path
        this.tryLoadingWithPath(fullPath, alternativePaths, modelPath, onLoad, onError, cache);
    }
    
    /**
     * Try loading a model with a specific path, falling back to alternatives if needed
     * 
     * @param {string} path - Path to try loading from
     * @param {Array<string>} alternativePaths - Alternative paths to try if this one fails
     * @param {string} originalPath - The original path for caching
     * @param {Function} onLoad - Success callback
     * @param {Function} onError - Error callback
     * @param {boolean} cache - Whether to cache the model
     */
    tryLoadingWithPath(path, alternativePaths, originalPath, onLoad, onError, cache) {
        console.log(`Attempting to load model from: ${path}`);
        
        this.loader.load(
            path,
            (gltf) => {
                const model = gltf.scene;
                
                // Apply shadow properties to all meshes in the model
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Cache the model if needed
                if (cache) {
                    this.models.set(originalPath, model.clone());
                }
                
                console.log(`Model loaded successfully: ${path}`);
                
                // Return the model via callback
                if (onLoad) onLoad(model);
            },
            // Progress callback
            (xhr) => {
                // Progress is already handled by the loading manager
            },
            // Error callback
            (error) => {
                console.error(`Failed to load model: ${path}`, error);
                
                // Try alternative paths if available
                if (alternativePaths.length > 0) {
                    // Remove the path we just tried if it's in the alternatives
                    alternativePaths = alternativePaths.filter(p => p !== path);
                    
                    if (alternativePaths.length > 0) {
                        const nextPath = alternativePaths[0];
                        console.log(`Retrying with alternative path: ${nextPath}`);
                        
                        // Try the next path
                        this.tryLoadingWithPath(nextPath, alternativePaths, originalPath, onLoad, onError, cache);
                        return;
                    }
                }
                
                // If we've exhausted all paths, call the error callback
                if (onError) onError(error);
            }
        );
    }
    
    /**
     * Preload a list of models to have them ready for use
     * 
     * @param {Array<string>} modelPaths - Array of model paths to preload
     * @param {Function} onComplete - Callback when all models are loaded
     */
    preloadModels(modelPaths, onComplete) {
        let loaded = 0;
        const total = modelPaths.length;
        
        modelPaths.forEach(path => {
            this.loadModel(path, () => {
                loaded++;
                if (loaded === total && onComplete) {
                    onComplete();
                }
            });
        });
    }
    
    /**
     * Get a previously cached model
     * 
     * @param {string} modelPath - Path of the cached model
     * @returns {THREE.Group|null} A clone of the cached model or null if not found
     */
    getModel(modelPath) {
        if (this.models.has(modelPath)) {
            return this.models.get(modelPath).clone();
        }
        return null;
    }
    
    /**
     * Clear all cached models to free memory
     */
    clearCache() {
        this.models.clear();
    }
} 