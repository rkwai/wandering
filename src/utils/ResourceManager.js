import * as THREE from 'three';
import { ModelLoader } from './ModelLoader';
import debugHelper from './DebugHelper.js';

/**
 * Class that manages all game resources (models, textures, etc.)
 */
export class ResourceManager {
    /**
     * Create a new resource manager
     * @param {THREE.Scene} scene - The scene to add models to
     * @param {Function} onReady - Callback when all resources are loaded
     */
    constructor(scene, onReady = null) {
        this.scene = scene;
        this.modelLoader = new ModelLoader();
        this.onReady = onReady;
        
        // Resource collections
        this.models = {
            spaceships: [],
            asteroids: [],
            planets: []
        };
        
        // Track loading status
        this.loadingStatus = {
            spaceship: false,
            asteroid: false
        };
        
        // Initialize resources
        this.init();
    }
    
    /**
     * Initialize all resources
     */
    init() {
        debugHelper.log("ResourceManager: Initializing resources");
        
        // Load spaceship model
        this.loadSpaceshipModel();
        
        // Load asteroid model
        debugHelper.log("ResourceManager: Loading asteroid model");
        this.loadAsteroidModel();
        
        debugHelper.log("Resource manager initialized");
    }
    
    /**
     * Check if all resources are loaded and call onReady if provided
     */
    checkAllResourcesLoaded() {
        debugHelper.log(`ResourceManager: Checking resources - spaceship: ${this.loadingStatus.spaceship}, asteroid: ${this.loadingStatus.asteroid}`);
        
        if (this.loadingStatus.spaceship && this.loadingStatus.asteroid) {
            debugHelper.log("ResourceManager: All resources loaded, calling onReady callback");
            if (this.onReady) {
                this.onReady();
            } else {
                debugHelper.log("ResourceManager: No onReady callback provided");
            }
        } else {
            debugHelper.log("ResourceManager: Not all resources loaded yet");
        }
    }
    
    /**
     * Load the spaceship model
     */
    loadSpaceshipModel() {
        this.modelLoader.loadModel('models/spaceships/spaceship_0304124415.glb', (model) => {
            // Add the model to our collection for reference
            this.models.spaceships.push({
                name: 'spaceship',
                model: model
            });
            
            // Hide the model - we're just preloading it
            model.visible = false;
            this.scene.add(model);
            
            debugHelper.log("Spaceship model loaded");
            
            // Update loading status
            this.loadingStatus.spaceship = true;
            this.checkAllResourcesLoaded();
        });
    }
    
    /**
     * Load the asteroid model
     */
    loadAsteroidModel() {
        debugHelper.log("ResourceManager: Starting asteroid model load");
        
        // Log the exact path being used
        const modelPath = 'models/asteroids/asteroid_0304124602.glb';
        debugHelper.log(`ResourceManager: Loading asteroid model from path: ${modelPath}`);
        
        this.modelLoader.loadModel(modelPath, 
            (model) => {
                debugHelper.log("ResourceManager: Asteroid model load callback triggered");
                
                if (!model) {
                    debugHelper.log("ResourceManager: Received null model in callback", "error");
                    this.loadingStatus.asteroid = true; // Mark as loaded to avoid blocking
                    this.checkAllResourcesLoaded();
                    return;
                }
                
                // Add the model to our collection for reference
                this.models.asteroids.push({
                    name: 'asteroid',
                    model: model
                });
                
                // We'll keep the original model invisible but make sure it's properly loaded
                model.visible = false;
                
                // Ensure the model is properly loaded by traversing it
                model.traverse(child => {
                    if (child.isMesh) {
                        // Just accessing the mesh ensures it's loaded
                        debugHelper.log(`ResourceManager: Asteroid model contains mesh: ${child.name || 'unnamed'}`);
                    }
                });
                
                this.scene.add(model);
                
                debugHelper.log(`ResourceManager: Asteroid model loaded and added to collection (models.asteroids.length: ${this.models.asteroids.length})`);
                
                // Update loading status
                this.loadingStatus.asteroid = true;
                this.checkAllResourcesLoaded();
            }, 
            (error) => {
                debugHelper.log(`ResourceManager: Failed to load asteroid model: ${error}`, "error");
                
                // Mark as loaded even if it failed, so we don't block the game
                this.loadingStatus.asteroid = true;
                this.checkAllResourcesLoaded();
            }
        );
    }
    
    /**
     * Get a spaceship model
     * @returns {THREE.Object3D} A spaceship model
     */
    getShipModel() {
        const ship = this.models.spaceships.find(m => m.name === 'spaceship');
        if (ship && ship.model) {
            try {
                return ship.model.clone();
            } catch (error) {
                console.error("Error cloning spaceship model:", error);
                return null;
            }
        }
        return null;
    }
    
    /**
     * Get a clone of the asteroid model
     * @returns {THREE.Object3D} A clone of the asteroid model
     */
    getAsteroidModel() {
        debugHelper.log("ResourceManager: Getting asteroid model");
        
        // Check if we have any asteroid models
        if (!this.models.asteroids || this.models.asteroids.length === 0) {
            debugHelper.log("ResourceManager: No asteroid models in collection", "error");
            return null;
        }
        
        const asteroid = this.models.asteroids.find(m => m.name === 'asteroid');
        if (asteroid && asteroid.model) {
            debugHelper.log("ResourceManager: Found asteroid model, cloning");
            try {
                const clonedModel = asteroid.model.clone();
                
                // Ensure the cloned model is visible
                clonedModel.visible = true;
                
                // Ensure all meshes in the cloned model are visible
                clonedModel.traverse(child => {
                    if (child.isMesh) {
                        child.visible = true;
                    }
                });
                
                debugHelper.log("ResourceManager: Successfully cloned asteroid model");
                return clonedModel;
            } catch (error) {
                console.error("Error cloning asteroid model:", error);
                debugHelper.log("ResourceManager: Error cloning asteroid model: " + error, "error");
                return null;
            }
        }
        
        debugHelper.log("ResourceManager: No asteroid model found", "error");
        return null;
    }
} 