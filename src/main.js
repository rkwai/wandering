import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';

import { WorldGenerator } from './world/WorldGenerator.js';
import { Player } from './entities/Player.js';
import { SpaceEnvironment } from './environment/SpaceEnvironment.js';
import { ModelShowcase } from './world/ModelShowcase.js';
import debugHelper from './utils/DebugHelper.js';

class Game {
    constructor() {
        debugHelper.log("Game initialization started...");
        
        // Set loading state
        this.isLoading = true;
        this.loadingErrors = [];
        
        // Update loading message
        this.updateLoadingMessage("Initializing game engine...");
        
        try {
            this.initThree();
            this.updateLoadingMessage("Setting up space environment...");
            this.initWorld();
            this.updateLoadingMessage("Preparing spaceship controls...");
            this.initPlayer();
            this.updateLoadingMessage("Loading 3D models...");
            this.initModelShowcase();
            this.initEventListeners();
            this.animate();
            
            debugHelper.log("All game systems initialized successfully");
            
            // Display model loading summary
            setTimeout(() => {
                debugHelper.log(debugHelper.getModelLoadingSummary());
            }, 2000);
            
            // Hide loading screen after everything is initialized with more time for model loading
            setTimeout(() => {
                if (this.loadingErrors.length > 0) {
                    debugHelper.log("Loading completed with errors", "error");
                    // Show error message but still continue
                    this.updateLoadingMessage("Warning: Some assets failed to load");
                    document.getElementById('loading-details').innerHTML = 
                        "The game will continue with limited features...";
                    setTimeout(() => {
                        document.getElementById('loading').style.display = 'none';
                        this.isLoading = false;
                    }, 2000);
                } else {
                    debugHelper.log("Loading completed successfully");
                    this.updateLoadingMessage("Ready to launch!");
                    document.getElementById('loading-details').innerHTML = 
                        "Entering space in 3...2...1...";
                    setTimeout(() => {
                        document.getElementById('loading').style.display = 'none';
                        this.isLoading = false;
                    }, 1500);
                }
            }, 5000); // Increased timeout to 5 seconds for model loading
        } catch (error) {
            debugHelper.log("Fatal error during game initialization: " + error.message, "error");
            this.updateLoadingMessage("Error loading game");
            document.getElementById('loading-details').innerHTML = 
                error.message + "<br>Please try refreshing the page.";
            this.loadingErrors.push(error.message);
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
        this.scene.background = new THREE.Color(0x000000); // Black background for space
        
        // No fog in space
        this.scene.fog = null;

        // Create camera - will be replaced with orthographic camera in Player class for side-scrolling
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            20000 // Much larger far plane for space distances
        );
        this.camera.position.set(0, 0, 50); // Position camera in front for side view
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Add ambient light (brighter for side-scroller)
        const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
        this.scene.add(ambientLight);
        
        // Add directional light (distant sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffcc, 1.0);
        this.directionalLight.position.set(0, 0, 100); // Position light behind camera for side-scroller
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
        
        // Add space environment effects (stars, nebulae, etc.)
        this.spaceEnvironment = new SpaceEnvironment(this.scene);
        
        // Set game mode
        this.gameMode = 'sideScroller';
    }

    initWorld() {
        this.worldGenerator = new WorldGenerator(this.scene);
        
        // For side-scroller, generate a different kind of world
        if (this.gameMode === 'sideScroller') {
            // Only generate celestial bodies
            this.worldGenerator.celestialBodies.createDistantPlanets();
        } else {
            this.worldGenerator.generateTerrain();
        }
    }

    initPlayer() {
        // Create an audio listener for 3D sound
        const audioListener = new THREE.AudioListener();
        this.camera.add(audioListener);
        
        // Initialize player with correct parameters: scene, camera, audioListener
        this.player = new Player(this.scene, this.camera, audioListener);
        
        // Make player accessible globally for debugging
        window.game = this;
    }

    initModelShowcase() {
        try {
            debugHelper.log("Initializing model showcase...");
            this.modelShowcase = new ModelShowcase(this.scene);
        } catch (error) {
            debugHelper.log("Error initializing model showcase: " + error.message, "error");
            this.loadingErrors.push("Model showcase: " + error.message);
            
            // Continue without the showcase by setting it to a simple object
            // This avoids null reference errors in the update loop
            this.modelShowcase = {
                update: () => {}, // Empty update function
                checkCollisions: () => null // Always return no collision
            };
        }
    }

    initEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Handle pointer lock for immersive first-person experience
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock ? this.clock.getDelta() : 0;
        if (!this.clock) {
            this.clock = new THREE.Clock();
        }
        
        // Update player
        if (this.player) {
            this.player.update(delta);
        }
        
        // Update space environment
        if (this.spaceEnvironment) {
            this.spaceEnvironment.update(delta);
        }
        
        // Update celestial bodies
        if (this.worldGenerator && this.worldGenerator.celestialBodies) {
            this.worldGenerator.celestialBodies.update(delta);
        }
        
        // Update model showcase
        if (this.modelShowcase) {
            this.modelShowcase.update(delta);
            
            // Check for collisions between player and showcase entities
            if (this.player && this.player.boundingBox) {
                const playerCollision = this.modelShowcase.checkCollisions(this.player.boundingBox);
                if (playerCollision && playerCollision.handleCollision) {
                    this.player.handleCollision(playerCollision);
                    playerCollision.handleCollision(this.player);
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