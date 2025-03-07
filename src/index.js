import * as THREE from 'three';

import { Player } from './entities/Player.js';
import { ResourceManager } from './utils/ResourceManager.js';
import { EnemyManager } from './entities/EnemyManager.js';
import debugHelper from './utils/DebugHelper.js';
import debugVisualizer from './utils/DebugVisualizer.js';
import { UIManager } from './ui/UIManager.js';

class Game {
    constructor() {
        debugHelper.log("Game initialization started...");
        
        try {
            this.initThree();
            // Initialize debug visualizer with the scene
            debugVisualizer.init(this.scene);
            const visualizer = debugVisualizer.getInstance();
            if (visualizer) {
                // Debug visualization is disabled by default
                // To enable, uncomment: visualizer.toggle(true);
            }
            debugHelper.log("Debug visualizer initialized");
            
            // Initialize UI Manager
            this.uiManager = new UIManager();
            this.scoreDisplay = this.uiManager.createScoreDisplay(0);
            debugHelper.log("UI Manager initialized");
            
            this.initResourceManager(); // This will call initEnemyManager and initPlayer when resources are loaded
            this.initEventListeners();
            this.animate();
            
            // Initialize player score
            this.score = 0;
            
            debugHelper.log("All game systems initialized successfully");
            
            // Display model loading summary after a short delay
            setTimeout(() => {
                debugHelper.log(debugHelper.getModelLoadingSummary());
            }, 2000);
            
        } catch (error) {
            debugHelper.log("Fatal error during game initialization: " + error.message, "error");
            console.error("Fatal error:", error);
        }
    }
    
    /**
     * Update the loading message displayed to the user
     * @param {string} message - The message to display
     */
    updateLoadingMessage(message) {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = message;
            console.log("Loading status:", message);
        }
    }

    initThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // Pure black background for space
        
        // No fog in space
        this.scene.fog = null;

        // Create orthographic camera for side-scrolling
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 100; // Larger view size for side-scrolling
        
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        
        // Position camera for side view (looking at XY plane)
        this.camera.position.set(0, 0, 100);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false, // Disable antialiasing for better performance
            powerPreference: 'high-performance' // Request high-performance GPU
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio for better performance
        this.renderer.shadowMap.enabled = false; // Disable shadow maps for better performance
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Performance optimization
        this.renderer.physicallyCorrectLights = false;
        this.renderer.outputEncoding = THREE.LinearEncoding; // Use simpler encoding
        
        // Add much brighter ambient light
        const ambientLight = new THREE.AmbientLight(0x404060, 2.0); // Increased intensity
        this.scene.add(ambientLight);
        
        // Add much brighter directional light
        this.directionalLight = new THREE.DirectionalLight(0xffffcc, 2.5); // Increased intensity
        this.directionalLight.position.set(100, 0, 100); // Position light for side-scroller
        this.directionalLight.castShadow = true;
        
        // Set up shadow properties
        this.directionalLight.shadow.mapSize.width = 2048; 
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 15000;
        this.directionalLight.shadow.camera.left = -1000;
        this.directionalLight.shadow.camera.right = 1000;
        this.directionalLight.shadow.camera.top = 1000;
        this.directionalLight.shadow.camera.bottom = -1000;
        
        this.scene.add(this.directionalLight);
        
        // Add a second directional light from the opposite side for better illumination
        const backLight = new THREE.DirectionalLight(0xccccff, 1.5);
        backLight.position.set(-100, 0, 100);
        this.scene.add(backLight);
                
        // Set game mode
        this.gameMode = 'sideScroller';
    }
    
    /**
     * Initialize the resource manager
     */
    initResourceManager() {
        try {
            debugHelper.log("Initializing resource manager...");
            
            // Create a loading indicator
            this.updateLoadingMessage("Loading game resources...");
            
            this.resourceManager = new ResourceManager(this.scene, () => {
                // Once resources are loaded, initialize enemy manager and player
                debugHelper.log("Resources loaded, initializing game entities");
                this.updateLoadingMessage("Resources loaded, initializing game...");
                
                // Initialize game entities in the correct order
                this.initEnemyManager();
                this.initPlayer();
                
                // Hide loading message
                this.updateLoadingMessage("");
                const loadingElement = document.getElementById('loading-message');
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                
                debugHelper.log("Game initialization complete");
            });
            
            // Add a timeout to handle the case where resource loading takes too long
            setTimeout(() => {
                if (!this.enemyManager) {
                    debugHelper.log("Resource loading timeout - forcing initialization", "warn");
                    this.updateLoadingMessage("Resource loading timeout - starting game anyway");
                    
                    // Force initialization
                    this.initEnemyManager();
                    this.initPlayer();
                    
                    // Hide loading message
                    setTimeout(() => {
                        this.updateLoadingMessage("");
                        const loadingElement = document.getElementById('loading-message');
                        if (loadingElement) {
                            loadingElement.style.display = 'none';
                        }
                    }, 2000);
                }
            }, 10000); // 10 second timeout
            
        } catch (error) {
            debugHelper.log("Error initializing resource manager: " + error.message, "error");
            
            // Create a minimal resource manager if initialization fails
            this.resourceManager = {
                getMissileModel: () => null,
                getShipModel: () => null,
                getAsteroidModel: () => null
            };
            
            // Continue with initialization even if resource manager fails
            this.initEnemyManager();
            this.initPlayer();
        }
    }
    
    /**
     * Initialize the enemy manager
     */
    initEnemyManager() {
        try {
            debugHelper.log("Initializing enemy manager...");
            this.enemyManager = new EnemyManager(this.scene, this.resourceManager);
        } catch (error) {
            debugHelper.log("Error initializing enemy manager: " + error.message, "error");
            
            // Create a minimal enemy manager if initialization fails
            this.enemyManager = {
                update: () => {},
                checkCollisions: () => null,
                entities: { asteroids: [] }
            };
        }
    }

    initPlayer() {
        // Create an audio listener for 3D sound
        const audioListener = new THREE.AudioListener();
        this.camera.add(audioListener);
        
        // Initialize player with correct parameters: scene, camera, audioListener, resourceManager
        this.player = new Player(this.scene, this.camera, audioListener, this.resourceManager);
        
        // Make player accessible globally for debugging
        window.game = this;
    }

    initEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Add keyboard listener for debug controls
        window.addEventListener('keydown', (event) => {
            // Toggle debug visualization with 'V' key
            if (event.key === 'v' || event.key === 'V') {
                const visualizer = debugVisualizer.getInstance();
                if (visualizer) {
                    visualizer.toggle();
                    debugHelper.log(`Debug visualization ${visualizer.enabled ? 'enabled' : 'disabled'}`);
                }
            }
        });
    }

    animate() {
        // Use bind-less requestAnimationFrame for better performance
        requestAnimationFrame(() => this.animate());
        
        // Use a fixed delta time for consistent physics
        const rawDelta = this.clock ? this.clock.getDelta() : 0.016;
        // Cap delta to prevent large jumps during lag spikes
        const delta = Math.min(rawDelta, 0.1);
        
        if (!this.clock) {
            this.clock = new THREE.Clock();
        }
        
        // Update player first for responsive controls
        if (this.player) {
            this.player.update(delta);
            
            // Update score if player score changes
            if (this.player.score !== undefined && this.score !== this.player.score) {
                debugHelper.log(`Score changed: ${this.score} -> ${this.player.score}`);
                this.score = this.player.score;
                if (this.uiManager) {
                    this.uiManager.updateScore(this.score);
                    debugHelper.log(`Updated UI score to: ${this.score}`);
                }
            }
        }
        
        // Update enemy manager
        if (this.enemyManager) {
            this.enemyManager.update(delta);
            
            // Check for collisions between player and enemies
            if (this.player && this.player.boundingBox) {
                const playerCollision = this.enemyManager.checkCollisions(this.player.boundingBox);
                
                // Add safety checks before handling collisions
                if (playerCollision) {
                    // Handle player collision with object
                    if (typeof this.player.handleCollision === 'function') {
                        this.player.handleCollision(playerCollision);
                    }
                    
                    // Handle object collision with player
                    if (playerCollision.handleCollision && typeof playerCollision.handleCollision === 'function') {
                        playerCollision.handleCollision(this.player);
                    } else if (playerCollision.userData && playerCollision.userData.parent && 
                              typeof playerCollision.userData.parent.handleCollision === 'function') {
                        // Try to use parent object's handleCollision if available
                        playerCollision.userData.parent.handleCollision(this.player);
                    }
                }
            }
        }
                
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page is loaded
window.addEventListener('load', () => {
    new Game();
}); 