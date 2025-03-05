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
        
        try {
            this.initThree();
            this.initWorld();
            this.initPlayer();
            this.initModelShowcase();
            this.initEventListeners();
            this.animate();
            
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
        
        // Add space environment (now only manages minimal background elements)
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
        }
        
        // Update model showcase (asteroids)
        if (this.modelShowcase) {
            this.modelShowcase.update(delta);
            
            // Check for collisions between player and showcase entities
            if (this.player && this.player.boundingBox) {
                const playerCollision = this.modelShowcase.checkCollisions(this.player.boundingBox);
                
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
        
        // Update space environment (lower priority)
        if (this.spaceEnvironment) {
            this.spaceEnvironment.update(delta);
        }
        
        // Update celestial bodies (lowest priority)
        if (this.worldGenerator && this.worldGenerator.celestialBodies) {
            this.worldGenerator.celestialBodies.update(delta);
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page is loaded
window.addEventListener('load', () => {
    new Game();
}); 