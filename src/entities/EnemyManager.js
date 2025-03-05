import * as THREE from 'three';
import { Asteroid } from './Asteroid';
import debugHelper from '../utils/DebugHelper.js';

/**
 * Class that manages enemy spawning and tracking
 */
export class EnemyManager {
    /**
     * Create a new enemy manager
     * @param {THREE.Scene} scene - The scene to add enemies to
     * @param {Object} resourceManager - The resource manager to get models from
     */
    constructor(scene, resourceManager = null) {
        this.scene = scene;
        this.resourceManager = resourceManager;
        
        debugHelper.log(`EnemyManager: Initialized with resourceManager: ${this.resourceManager ? 'provided' : 'not provided'}`);
        
        // Collection of spawned entities
        this.entities = {
            asteroids: [],       // All asteroids (including those still loading)
            loadedAsteroids: []  // Only fully loaded asteroids with models
        };
        
        // Track pending asteroid loads
        this.pendingAsteroidLoads = 0;
        
        // Start with higher difficulty
        this.initialDifficultyLevel = 3; // Start at equivalent of level 3
        
        // Spawning configuration
        this.gameTime = 0;
        this.gameProgress = 0;
        this.lastSpawnTime = 0;
        
        // Different enemy types and their properties - adjusted for higher initial difficulty
        this.enemyTypes = {
            basic: {
                baseSpawnInterval: 1.5,   // Faster spawning
                maxEntities: 20,          // More entities
                speedRange: { min: 15, max: 22 }  // Faster speeds
            },
            fast: {
                baseSpawnInterval: 2.0,    // Faster spawning
                maxEntities: 12,           // More entities
                speedRange: { min: 25, max: 35 }  // Faster speeds
            },
            wavey: {
                baseSpawnInterval: 2.5,    // Faster spawning
                maxEntities: 10,           // More entities
                speedRange: { min: 18, max: 28 }  // Faster speeds
            }
        };
        
        // Wave and level configuration - shorter durations for faster pacing
        this.currentLevel = this.initialDifficultyLevel;
        this.currentWave = 1;
        this.waveDuration = 15; // Shorter waves
        this.levelDuration = 45; // Shorter levels
        this.waveStartTime = 0;
        this.waveEndTime = this.waveDuration;
        
        // More frequent events
        this.progressEvents = [
            { progress: 0.20, event: 'increaseDifficulty', triggered: false },
            { progress: 0.40, event: 'spawnWave', triggered: false },
            { progress: 0.60, event: 'increaseDifficulty', triggered: false },
            { progress: 0.80, event: 'spawnWave', triggered: false },
            { progress: 0.90, event: 'prepareBoss', triggered: false }
        ];
        
        // Create some initial asteroids
        this.createInitialAsteroids();
        
        // Spawn initial wave of all types
        this.spawnInitialWave();
        
        debugHelper.log("Enemy manager initialized with high difficulty");
    }
    
    /**
     * Create the initial set of asteroids
     */
    createInitialAsteroids() {
        const count = 5;
        
        debugHelper.log(`EnemyManager: Creating ${count} initial asteroids, resourceManager: ${this.resourceManager ? 'provided' : 'not provided'}`);
        this.pendingAsteroidLoads += count;
        
        for (let i = 0; i < count; i++) {
            // Position asteroids off-screen to the right, so they move into view
            const xPos = Math.random() * 100 + 180; // 180-280 units from right (off-screen)
            
            // Varied vertical positions, but keep within likely visible area
            const yPos = (Math.random() - 0.5) * 80; // Smaller height coverage to ensure visibility
            
            // Keep Z near 0 for side-scroller
            const position = new THREE.Vector3(xPos, yPos, 0);
            
            // Create different movement patterns
            const pattern = Math.floor(Math.random() * 4);
            let velocity;
            
            switch (pattern) {
                case 0: // Standard left movement
                    velocity = new THREE.Vector3(-Math.random() * 15 - 10, 0, 0);
                    break;
                case 1: // Diagonal down
                    velocity = new THREE.Vector3(-Math.random() * 15 - 10, -Math.random() * 8 - 3, 0);
                    break;
                case 2: // Diagonal up
                    velocity = new THREE.Vector3(-Math.random() * 15 - 10, Math.random() * 8 + 3, 0);
                    break;
                case 3: // Sine wave pattern (vertical movement handled in Asteroid class)
                    velocity = new THREE.Vector3(-Math.random() * 15 - 10, 0, 0);
                    break;
            }
            
            // Create the asteroid with the position and velocity
            debugHelper.log(`EnemyManager: Creating asteroid ${i+1}/${count} with pattern ${pattern} at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
            
            // Define the onLoaded callback
            const onLoaded = (asteroid) => {
                debugHelper.log(`EnemyManager: Asteroid ${i+1}/${count} model loaded successfully at position (${asteroid.position.x.toFixed(1)}, ${asteroid.position.y.toFixed(1)}, ${asteroid.position.z.toFixed(1)})`);
                this.entities.loadedAsteroids.push(asteroid);
                this.pendingAsteroidLoads--;
                debugHelper.log(`EnemyManager: ${this.pendingAsteroidLoads} asteroids still loading, ${this.entities.loadedAsteroids.length} loaded`);
            };
            
            const asteroid = new Asteroid(this.scene, position, velocity, pattern, this.resourceManager, onLoaded);
            this.entities.asteroids.push(asteroid);
            debugHelper.log(`EnemyManager: Added asteroid to entities, total count: ${this.entities.asteroids.length}`);
        }
    }
    
    /**
     * Spawn an initial wave of all enemy types
     */
    spawnInitialWave() {
        debugHelper.log("EnemyManager: Spawning initial high-difficulty wave");
        
        // Spawn some of each type
        ['basic', 'fast', 'wavey'].forEach(type => {
            const count = type === 'basic' ? 6 : 4; // More basic enemies
            debugHelper.log(`EnemyManager: Spawning ${count} ${type} enemies in initial wave`);
            
            for (let i = 0; i < count; i++) {
                this.spawnEnemy(type);
            }
        });
        
        debugHelper.log(`EnemyManager: Initial wave complete, total asteroids: ${this.entities.asteroids.length}`);
    }
    
    /**
     * Update all enemies and handle spawning
     * @param {number} delta - Time step in seconds
     */
    update(delta) {
        // Update game time
        this.gameTime += delta;
        
        // Calculate overall progress (0-1)
        this.gameProgress = Math.min((this.gameTime % this.levelDuration) / this.levelDuration, 1);
        
        // Check for progress-based events
        this.checkProgressEvents();
        
        // Determine if we should spawn based on current wave
        this.updateWaveState();
        
        // Spawn enemies based on current game state
        this.spawnEnemies(delta);
        
        // Log asteroid count periodically (every ~5 seconds)
        if (Math.floor(this.gameTime) % 5 === 0 && Math.floor(this.gameTime) !== Math.floor(this.gameTime - delta)) {
            debugHelper.log(`EnemyManager: Currently managing ${this.entities.asteroids.length} asteroids (${this.entities.loadedAsteroids.length} loaded, ${this.pendingAsteroidLoads} loading) at time ${this.gameTime.toFixed(1)}`);
        }
        
        // Update all loaded asteroids
        this.entities.loadedAsteroids.forEach(asteroid => {
            asteroid.update(delta);
        });
        
        // Remove any entities marked for removal
        const beforeCount = this.entities.asteroids.length;
        const beforeLoadedCount = this.entities.loadedAsteroids.length;
        this.cleanupEntities();
        const afterCount = this.entities.asteroids.length;
        const afterLoadedCount = this.entities.loadedAsteroids.length;
        
        // Log if any asteroids were removed
        if (beforeCount !== afterCount || beforeLoadedCount !== afterLoadedCount) {
            debugHelper.log(`EnemyManager: Removed ${beforeCount - afterCount} asteroids (${beforeLoadedCount - afterLoadedCount} loaded), ${afterCount} remaining (${afterLoadedCount} loaded)`);
        }
    }
    
    /**
     * Clean up any entities marked for removal
     */
    cleanupEntities() {
        // Filter out asteroids marked for removal
        this.entities.asteroids = this.entities.asteroids.filter(asteroid => !asteroid.markedForRemoval);
        
        // Also filter the loadedAsteroids array
        this.entities.loadedAsteroids = this.entities.loadedAsteroids.filter(asteroid => !asteroid.markedForRemoval);
    }
    
    /**
     * Check and trigger events based on game progress
     */
    checkProgressEvents() {
        this.progressEvents.forEach(event => {
            if (this.gameProgress >= event.progress && !event.triggered) {
                // Handle the event
                switch (event.event) {
                    case 'increaseDifficulty':
                        this.increaseDifficulty();
                        break;
                    case 'spawnWave':
                        this.spawnEnemyWave();
                        break;
                    case 'prepareBoss':
                        this.prepareBossEncounter();
                        break;
                }
                
                // Mark as triggered for this level
                event.triggered = true;
                
                debugHelper.log(`Triggered ${event.event} event at progress ${event.progress}`);
            }
            
            // Reset trigger state when we loop back to the beginning
            if (this.gameProgress < 0.05 && event.triggered) {
                event.triggered = false;
            }
        });
    }
    
    /**
     * Update the current wave state based on game time
     */
    updateWaveState() {
        const currentWaveTime = this.gameTime % this.levelDuration;
        
        // Determine the current wave within the level
        this.currentWave = Math.floor(currentWaveTime / this.waveDuration) + 1;
        this.waveStartTime = (this.currentWave - 1) * this.waveDuration;
        this.waveEndTime = this.waveStartTime + this.waveDuration;
        
        // Update the level when we complete all waves
        if (this.gameProgress < 0.05 && this.gameProgress > 0) {
            this.currentLevel = Math.floor(this.gameTime / this.levelDuration) + 1;
            debugHelper.log(`Starting level ${this.currentLevel}`);
        }
    }
    
    /**
     * Spawn enemies based on current game state
     * @param {number} delta - Time step in seconds
     */
    spawnEnemies(delta) {
        // Check each enemy type for spawning
        Object.entries(this.enemyTypes).forEach(([type, config]) => {
            // Calculate adjusted spawn interval based on level and progress
            const adjustedInterval = this.getAdjustedSpawnInterval(config.baseSpawnInterval);
            
            // Check if it's time to spawn this enemy type
            if (this.gameTime - this.lastSpawnTime >= adjustedInterval) {
                // Count current entities of this type
                const currentCount = this.countEntitiesByType(type);
                
                // Only spawn if below max limit
                if (currentCount < config.maxEntities) {
                    // Try to spawn
                    if (Math.random() < this.getSpawnProbability(type)) {
                        this.spawnEnemy(type);
                        this.lastSpawnTime = this.gameTime;
                    }
                }
            }
        });
    }
    
    /**
     * Get adjusted spawn interval based on current game state
     * @param {number} baseInterval - Base spawn interval
     * @returns {number} Adjusted interval
     */
    getAdjustedSpawnInterval(baseInterval) {
        // Start with higher difficulty factor
        const levelFactor = Math.max(1.0 - (this.currentLevel + 2) * 0.1, 0.4);
        
        // More aggressive wave progression
        const waveProgress = (this.gameTime - this.waveStartTime) / this.waveDuration;
        const waveFactor = Math.max(1.0 - waveProgress * 0.3, 0.6);
        
        return baseInterval * levelFactor * waveFactor;
    }
    
    /**
     * Get spawn probability based on enemy type and current game state
     * @param {string} type - Enemy type
     * @returns {number} Probability (0-1)
     */
    getSpawnProbability(type) {
        // Higher base probability
        let probability = 0.85;
        
        const waveProgress = (this.gameTime - this.waveStartTime) / this.waveDuration;
        
        // Adjusted type probabilities for more challenging mix
        switch (type) {
            case 'basic':
                probability *= (0.8 - waveProgress * 0.3); // Fewer basic enemies
                break;
            case 'fast':
                probability *= (0.7 + waveProgress * 0.3); // More fast enemies
                break;
            case 'wavey':
                probability *= (0.6 + waveProgress * 0.4); // More wavey enemies
                break;
        }
        
        // More aggressive level scaling
        probability *= (1 + (this.currentLevel - 1) * 0.15);
        
        return Math.min(probability, 1.0);
    }
    
    /**
     * Count entities by type
     * @param {string} type - Entity type to count
     * @returns {number} Count of entities
     */
    countEntitiesByType(type) {
        // For now, just count all asteroids
        return this.entities.asteroids.length;
    }
    
    /**
     * Spawn a new enemy of the specified type
     * @param {string} type - Enemy type to spawn
     */
    spawnEnemy(type) {
        debugHelper.log(`EnemyManager: Attempting to spawn enemy of type ${type}`);
        
        // Get configuration for this enemy type
        const config = this.enemyTypes[type];
        
        // Position asteroids off-screen to the right so they move into view
        const xPos = Math.random() * 100 + 150; // 150-250 units from right (off-screen)
        const yPos = (Math.random() - 0.5) * 80; // Smaller height coverage to ensure visibility
        const position = new THREE.Vector3(xPos, yPos, 0);
        
        // Determine movement pattern based on type
        let pattern = 0;
        let speedMultiplier = 1.0;
        
        switch (type) {
            case 'basic':
                pattern = 0; // Simple left movement
                speedMultiplier = 1.0;
                break;
            case 'fast':
                pattern = Math.random() < 0.5 ? 1 : 2; // Diagonal movement
                speedMultiplier = 1.5;
                break;
            case 'wavey':
                pattern = 3; // Sine wave pattern
                speedMultiplier = 1.2;
                break;
        }
        
        // Calculate speed based on configuration and level
        const baseSpeed = Math.random() * 
            (config.speedRange.max - config.speedRange.min) + 
            config.speedRange.min;
        
        // Adjust speed based on level (higher levels = faster enemies)
        const levelSpeedMultiplier = 1 + (this.currentLevel - 1) * 0.1;
        const finalSpeed = baseSpeed * speedMultiplier * levelSpeedMultiplier;
        
        // Create velocity vector
        let velocity;
        switch (pattern) {
            case 0: // Standard left movement
                velocity = new THREE.Vector3(-finalSpeed, 0, 0);
                break;
            case 1: // Diagonal down
                velocity = new THREE.Vector3(-finalSpeed, -finalSpeed * 0.4, 0);
                break;
            case 2: // Diagonal up
                velocity = new THREE.Vector3(-finalSpeed, finalSpeed * 0.4, 0);
                break;
            case 3: // Sine wave pattern
                velocity = new THREE.Vector3(-finalSpeed, 0, 0);
                break;
        }
        
        debugHelper.log(`EnemyManager: Creating asteroid with pattern ${pattern}, speed ${finalSpeed.toFixed(1)} at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        
        // Increment pending loads counter
        this.pendingAsteroidLoads++;
        
        // Define the onLoaded callback
        const onLoaded = (asteroid) => {
            debugHelper.log(`EnemyManager: New asteroid model loaded successfully at position (${asteroid.position.x.toFixed(1)}, ${asteroid.position.y.toFixed(1)}, ${asteroid.position.z.toFixed(1)})`);
            this.entities.loadedAsteroids.push(asteroid);
            this.pendingAsteroidLoads--;
            debugHelper.log(`EnemyManager: ${this.pendingAsteroidLoads} asteroids still loading, ${this.entities.loadedAsteroids.length} loaded`);
        };
        
        // Create and add the new asteroid (currently our only enemy type)
        const asteroid = new Asteroid(this.scene, position, velocity, pattern, this.resourceManager, onLoaded);
        
        // Add to the entity collection
        this.entities.asteroids.push(asteroid);
        
        debugHelper.log(`EnemyManager: Spawned ${type} enemy at position ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, total count: ${this.entities.asteroids.length}`);
    }
    
    /**
     * Spawn a wave of enemies
     */
    spawnEnemyWave() {
        const waveSize = 5 + this.currentLevel * 2; // More enemies in higher levels
        
        debugHelper.log(`Spawning wave of ${waveSize} enemies`);
        
        // Increment pending loads counter
        this.pendingAsteroidLoads += waveSize;
        
        // Spawn enemies in a formation
        for (let i = 0; i < waveSize; i++) {
            // Create a formation pattern - line, V-shape, etc.
            // Position off-screen to the right
            const xPos = Math.random() * 80 + 200; // 200-280 units from right (off-screen)
            const yPos = (Math.random() - 0.5) * 70; // In formation, but within visible area
            const position = new THREE.Vector3(xPos, yPos, 0);
            
            // Enemies in a wave move more cohesively
            const pattern = i % 4; // Mix of patterns
            const speed = 15 + this.currentLevel * 2; // Faster in higher levels
            
            let velocity;
            switch (pattern) {
                case 0: // Standard left movement
                    velocity = new THREE.Vector3(-speed, 0, 0);
                    break;
                case 1: // Diagonal down
                    velocity = new THREE.Vector3(-speed, -speed * 0.3, 0);
                    break;
                case 2: // Diagonal up
                    velocity = new THREE.Vector3(-speed, speed * 0.3, 0);
                    break;
                case 3: // Sine wave pattern
                    velocity = new THREE.Vector3(-speed, 0, 0);
                    break;
            }
            
            // Define the onLoaded callback
            const onLoaded = (asteroid) => {
                debugHelper.log(`EnemyManager: Wave asteroid ${i+1}/${waveSize} model loaded successfully at position (${asteroid.position.x.toFixed(1)}, ${asteroid.position.y.toFixed(1)}, ${asteroid.position.z.toFixed(1)})`);
                this.entities.loadedAsteroids.push(asteroid);
                this.pendingAsteroidLoads--;
                debugHelper.log(`EnemyManager: ${this.pendingAsteroidLoads} asteroids still loading, ${this.entities.loadedAsteroids.length} loaded`);
            };
            
            // Create the asteroid
            const asteroid = new Asteroid(this.scene, position, velocity, pattern, this.resourceManager, onLoaded);
            this.entities.asteroids.push(asteroid);
            
            // Slight delay between each spawn
            this.lastSpawnTime = this.gameTime;
        }
    }
    
    /**
     * Increase difficulty based on progress
     */
    increaseDifficulty() {
        debugHelper.log(`Increasing difficulty at level ${this.currentLevel}, wave ${this.currentWave}`);
        
        // Increase speed of all existing loaded asteroids
        this.entities.loadedAsteroids.forEach(asteroid => {
            if (asteroid.velocity) {
                asteroid.velocity.x *= 1.2; // 20% speed increase
            }
        });
    }
    
    /**
     * Prepare for a boss encounter
     */
    prepareBossEncounter() {
        debugHelper.log(`Preparing for boss encounter at level ${this.currentLevel}`);
        
        // Clear most existing enemies to make room for the boss
        const keepCount = 5; // Keep a few enemies
        if (this.entities.asteroids.length > keepCount) {
            // Mark excess asteroids for removal
            for (let i = keepCount; i < this.entities.asteroids.length; i++) {
                this.entities.asteroids[i].markedForRemoval = true;
            }
        }
        
        // In the future, this would spawn a boss enemy
        // For now, just spawn a bigger, tougher asteroid
        const xPos = 250; // Start off-screen to the right
        const yPos = 0;   // Center
        const position = new THREE.Vector3(xPos, yPos, 0);
        const velocity = new THREE.Vector3(-8, 0, 0); // Slower but tougher
        
        // Log the boss spawn position
        debugHelper.log(`EnemyManager: Spawning boss asteroid at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        
        // Increment pending loads counter
        this.pendingAsteroidLoads++;
        
        // Define the onLoaded callback
        const onLoaded = (asteroid) => {
            debugHelper.log(`EnemyManager: Boss asteroid model loaded successfully at position (${asteroid.position.x.toFixed(1)}, ${asteroid.position.y.toFixed(1)}, ${asteroid.position.z.toFixed(1)})`);
            this.entities.loadedAsteroids.push(asteroid);
            this.pendingAsteroidLoads--;
            debugHelper.log(`EnemyManager: ${this.pendingAsteroidLoads} asteroids still loading, ${this.entities.loadedAsteroids.length} loaded`);
        };
        
        // Create a "boss" asteroid
        const bossAsteroid = new Asteroid(this.scene, position, velocity, 3, this.resourceManager, onLoaded);
        
        // Make it bigger and tougher
        bossAsteroid.scale = 4.0;
        bossAsteroid.mass = 200;
        
        // Add to collection
        this.entities.asteroids.push(bossAsteroid);
        
        debugHelper.log(`EnemyManager: Boss asteroid spawned at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
    }
    
    /**
     * Check for collisions with any entities
     * @param {THREE.Box3} boundingBox - The bounding box to check collisions against
     * @returns {Object|null} The first entity that collided, or null if no collision
     */
    checkCollisions(boundingBox) {
        // Safety check - if no boundingBox is provided, return null
        if (!boundingBox) {
            return null;
        }
        
        // Check collision with each loaded asteroid
        for (const asteroid of this.entities.loadedAsteroids) {
            // Only check asteroids that have a valid boundingBox
            if (asteroid.boundingBox && boundingBox.intersectsBox(asteroid.boundingBox)) {
                // Return the asteroidGroup which has the userData property
                return asteroid.asteroidGroup || asteroid;
            }
        }
        
        return null;
    }
} 