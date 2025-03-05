import { Asteroid } from '../entities/Asteroid.js';
import { gameEvents, GameEvents } from './EventSystem.js';

/**
 * Manages level data, enemy spawning, and progression
 */
export class LevelSystem {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = 0;
        this.currentWaveIndex = 0;
        this.waveTimer = 0;
        this.totalTime = 0;
        this.activeEnemies = new Set();
        this.isActive = false;
        this.bossSpawned = false;
        
        // Listen for level events
        gameEvents.on(GameEvents.ENEMY_DESTROYED, this.onEnemyDestroyed.bind(this));
    }
    
    /**
     * Start a specific level
     * @param {number} levelNumber - Level to start (1-based index)
     */
    startLevel(levelNumber) {
        // Ensure valid level number
        if (levelNumber < 1 || levelNumber > levelData.length) {
            console.error(`Invalid level number: ${levelNumber}`);
            return;
        }
        
        this.currentLevel = levelNumber - 1;
        this.currentWaveIndex = 0;
        this.waveTimer = 0;
        this.totalTime = 0;
        this.activeEnemies.clear();
        this.isActive = true;
        this.bossSpawned = false;
        
        console.log(`Starting level ${levelNumber}`);
        gameEvents.emit(GameEvents.LEVEL_START, { level: levelNumber });
        
        // Set up level environment
        this.applyLevelEnvironment(levelData[this.currentLevel]);
    }
    
    /**
     * Apply level-specific environment settings
     * @param {Object} levelConfig - Configuration for the current level
     */
    applyLevelEnvironment(levelConfig) {
        if (levelConfig.background) {
            // TODO: Set up background based on level theme
            console.log(`Setting background: ${levelConfig.background}`);
        }
        
        if (levelConfig.music) {
            // TODO: Play level music
            console.log(`Playing music: ${levelConfig.music}`);
        }
        
        // Apply any other level-specific settings
    }
    
    /**
     * Update level state
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        if (!this.isActive) return;
        
        this.totalTime += delta;
        this.waveTimer += delta;
        
        const level = levelData[this.currentLevel];
        
        // Check if we need to spawn a boss
        if (level.boss && !this.bossSpawned && this.currentWaveIndex >= level.waves.length) {
            console.log('Spawning boss!');
            this.spawnBoss(level.boss);
            this.bossSpawned = true;
            return;
        }
        
        // Check if we need to spawn a new wave
        if (this.currentWaveIndex < level.waves.length) {
            const currentWave = level.waves[this.currentWaveIndex];
            
            // Check if it's time to spawn this wave
            if (this.totalTime >= currentWave.time) {
                this.spawnWave(currentWave);
                this.currentWaveIndex++;
                this.waveTimer = 0;
            }
        }
        
        // Check for level completion
        if (this.bossSpawned && this.activeEnemies.size === 0) {
            this.completeLevel();
        }
    }
    
    /**
     * Spawn a wave of enemies
     * @param {Object} waveData - Data for the wave to spawn
     */
    spawnWave(waveData) {
        console.log(`Spawning wave: ${waveData.type}, count: ${waveData.count}`);
        
        // Different handling based on enemy type
        switch (waveData.type) {
            case 'asteroid':
                this.spawnAsteroids(waveData);
                break;
                
            // Add cases for other enemy types
            // case 'fighter':
            //     this.spawnFighters(waveData);
            //     break;
                
            default:
                console.warn(`Unknown enemy type: ${waveData.type}`);
        }
        
        gameEvents.emit(GameEvents.SHOW_MESSAGE, { 
            text: waveData.message || `WAVE ${this.currentWaveIndex + 1}`, 
            duration: 2 
        });
    }
    
    /**
     * Spawn asteroid enemies
     * @param {Object} waveData - Data for the asteroid wave
     */
    spawnAsteroids(waveData) {
        const pattern = waveData.pattern || 'random';
        const count = waveData.count || 5;
        
        for (let i = 0; i < count; i++) {
            // Add slight delay between spawns
            setTimeout(() => {
                const movementPattern = pattern === 'sine' ? 3 : 0;
                const asteroid = new Asteroid(this.scene, null, null, movementPattern);
                
                // Track the active enemy
                this.activeEnemies.add(asteroid);
                
                // Listen for removal
                const originalRemove = asteroid.remove.bind(asteroid);
                asteroid.remove = () => {
                    originalRemove();
                    this.activeEnemies.delete(asteroid);
                };
                
            }, i * 300); // 300ms between each spawn
        }
    }
    
    /**
     * Spawn a boss enemy
     * @param {Object} bossData - Data for the boss to spawn
     */
    spawnBoss(bossData) {
        console.log(`Spawning boss: ${bossData.type}`);
        
        // TODO: Implement boss spawning
        // For now, just send a message
        gameEvents.emit(GameEvents.SHOW_MESSAGE, { 
            text: 'WARNING: BOSS APPROACHING', 
            duration: 3 
        });
        
        // Create a placeholder boss (just a big asteroid for now)
        setTimeout(() => {
            const position = new THREE.Vector3(300, 0, 0);
            const velocity = new THREE.Vector3(-5, 0, 0);
            const asteroid = new Asteroid(this.scene, position, velocity, 3);
            
            // Make it much bigger
            asteroid.scale = 10;
            
            // Track as an active enemy
            this.activeEnemies.add(asteroid);
            
            // Override remove method to track when it's destroyed
            const originalRemove = asteroid.remove.bind(asteroid);
            asteroid.remove = () => {
                originalRemove();
                this.activeEnemies.delete(asteroid);
                gameEvents.emit(GameEvents.SHOW_MESSAGE, { 
                    text: 'BOSS DEFEATED!', 
                    duration: 3 
                });
            };
        }, 3000);
    }
    
    /**
     * Handle enemy destroyed event
     * @param {Object} data - Data about the destroyed enemy
     */
    onEnemyDestroyed(data) {
        if (data.enemy) {
            this.activeEnemies.delete(data.enemy);
        }
    }
    
    /**
     * Complete the current level and progress
     */
    completeLevel() {
        if (!this.isActive) return;
        
        this.isActive = false;
        console.log(`Level ${this.currentLevel + 1} complete!`);
        
        gameEvents.emit(GameEvents.LEVEL_COMPLETE, { 
            level: this.currentLevel + 1,
            nextLevel: this.currentLevel + 2
        });
        
        // Check if there are more levels
        if (this.currentLevel + 1 < levelData.length) {
            // Give the player a moment before starting the next level
            setTimeout(() => {
                this.startLevel(this.currentLevel + 2);
            }, 5000);
        } else {
            // Game complete!
            gameEvents.emit(GameEvents.SHOW_MESSAGE, { 
                text: 'CONGRATULATIONS! GAME COMPLETE', 
                duration: 0 
            });
        }
    }
}

/**
 * Level data defining the progression of the game
 */
export const levelData = [
    // Level 1
    {
        name: "Asteroid Field",
        background: "space-nebula",
        music: "level1",
        waves: [
            { time: 0, type: 'asteroid', count: 5, pattern: 'random', message: 'ENTERING ASTEROID FIELD' },
            { time: 15, type: 'asteroid', count: 8, pattern: 'random' },
            { time: 30, type: 'asteroid', count: 5, pattern: 'sine', message: 'CAUTION: MOVING ASTEROIDS' },
            { time: 45, type: 'asteroid', count: 10, pattern: 'random' }
        ],
        boss: {
            type: 'giant-asteroid',
            health: 100,
            pattern: 'sine'
        }
    },
    
    // Level 2
    {
        name: "Enemy Patrol",
        background: "red-nebula",
        music: "level2",
        waves: [
            { time: 0, type: 'asteroid', count: 3, pattern: 'random', message: 'LEVEL 2: ENEMY PATROL' },
            { time: 10, type: 'fighter', count: 5, pattern: 'formation' },
            { time: 25, type: 'asteroid', count: 5, pattern: 'sine' },
            { time: 35, type: 'fighter', count: 8, pattern: 'attack' },
            { time: 50, type: 'asteroid', count: 10, pattern: 'random' }
        ],
        boss: {
            type: 'patrol-leader',
            health: 200,
            pattern: 'attack'
        }
    }
]; 