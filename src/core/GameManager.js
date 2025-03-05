import { GameStateManager } from './GameState.js';
import { LevelSystem } from './LevelSystem.js';
import { gameEvents, GameEvents } from './EventSystem.js';
import { UISystem } from './UISystem.js';
import { PlayerEntity } from '../entities/PlayerEntity.js';
import { AsteroidEntity } from '../entities/AsteroidEntity.js';
import * as THREE from 'three';

/**
 * Main game manager that orchestrates all game systems
 */
export class GameManager {
    constructor() {
        // Initialize the basic Three.js setup
        this.initializeThreeJS();
        
        // Create all game systems
        this.stateManager = new GameStateManager(this);
        this.uiSystem = new UISystem();
        
        // Level system is initialized after scene is created
        this.levelSystem = null;
        
        // Track entities
        this.player = null;
        this.entities = new Set();
        
        // Game state
        this.score = 0;
        this.isPaused = false;
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Initialize Three.js renderer, scene, camera, etc.
     */
    initializeThreeJS() {
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        document.body.appendChild(this.renderer.domElement);
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera for side-scroller
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        
        // Set up camera initial position
        this.camera.position.set(0, 0, 80);
        this.camera.lookAt(0, 0, 0);
        
        // Create audio listener
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Create level system now that scene is ready
        this.levelSystem = new LevelSystem(this.scene);
    }
    
    /**
     * Set up event listeners for game events
     */
    setupEventListeners() {
        // Listen for player death
        gameEvents.on(GameEvents.PLAYER_DEATH, () => {
            this.stateManager.changeState('gameOver');
        });
        
        // Listen for level completion
        gameEvents.on(GameEvents.LEVEL_COMPLETE, (data) => {
            console.log(`Level ${data.level} complete!`);
            
            // Update score
            this.score += 1000;
            gameEvents.emit(GameEvents.SCORE_CHANGED, { score: this.score });
            
            // If no more levels, game is complete
            if (!data.nextLevel) {
                this.stateManager.changeState('gameOver');
            }
        });
        
        // Listen for enemy destruction for score
        gameEvents.on(GameEvents.ENEMY_DESTROYED, (data) => {
            if (data.type === 'asteroid') {
                // Base score on size/mass
                const scoreIncrease = Math.floor(data.entity.physics.mass * 10);
                this.score += scoreIncrease;
                gameEvents.emit(GameEvents.SCORE_CHANGED, { score: this.score });
            }
        });
    }
    
    /**
     * Start the game
     */
    start() {
        // Initialize state manager with menu state
        this.stateManager.init('menu');
        
        // Start animation loop
        this.animate();
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Calculate delta time (capped to avoid large jumps)
        const now = performance.now();
        if (!this.lastTime) this.lastTime = now;
        const delta = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        
        // Skip update if paused
        if (this.isPaused) return;
        
        // Update game state
        this.stateManager.update(delta);
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Create the player
     */
    createPlayer() {
        // Create player entity
        this.player = new PlayerEntity(this.scene, this.camera, this.audioListener);
        this.entities.add(this.player);
        
        return this.player;
    }
    
    /**
     * Create an asteroid
     */
    createAsteroid(position = null, velocity = null, pattern = 0) {
        const asteroid = new AsteroidEntity(this.scene, position, velocity, pattern);
        this.entities.add(asteroid);
        
        return asteroid;
    }
    
    /**
     * Update all game entities
     */
    updateEntities(delta) {
        // Update level system
        if (this.levelSystem) {
            this.levelSystem.update(delta);
        }
        
        // Update all entities
        for (const entity of this.entities) {
            if (entity.active) {
                entity.update(delta);
            }
        }
        
        // Clean up inactive entities
        for (const entity of this.entities) {
            if (!entity.active) {
                this.entities.delete(entity);
            }
        }
    }
    
    /**
     * Reset the game for a new session
     */
    resetGame() {
        // Clear all entities
        for (const entity of this.entities) {
            entity.destroy();
        }
        this.entities.clear();
        
        // Reset player
        this.player = null;
        
        // Reset score
        this.score = 0;
        gameEvents.emit(GameEvents.SCORE_CHANGED, { score: this.score });
        
        // Create player
        this.createPlayer();
        
        // Start at first level
        this.levelSystem.startLevel(1);
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        this.isPaused = true;
        gameEvents.emit(GameEvents.GAME_PAUSE);
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        this.isPaused = false;
        gameEvents.emit(GameEvents.GAME_RESUME);
    }
} 