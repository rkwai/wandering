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
     * Load a GLB/GLTF model
     * 
     * @param {string} modelPath - Path to the model (if relative, /assets/ will be prepended)
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
        
        // Process the path - if it starts with / or http, treat as absolute, otherwise add /assets/
        const fullPath = modelPath.startsWith('/') || modelPath.startsWith('http') 
            ? modelPath 
            : `/assets/${modelPath}`;
        
        console.log(`Loading model from path: ${fullPath}`);
        
        this.loadModelFromPath(fullPath, modelPath, onLoad, onError, cache);
    }
    
    /**
     * Load a model from the specified path
     * 
     * @param {string} path - Path to load the model from
     * @param {string} originalPath - The original path for caching
     * @param {Function} onLoad - Success callback
     * @param {Function} onError - Error callback
     * @param {boolean} cache - Whether to cache the model
     */
    loadModelFromPath(path, originalPath, onLoad, onError, cache) {
        console.log(`Loading model from: ${path}`);
        
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
                
                // Call the error callback
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