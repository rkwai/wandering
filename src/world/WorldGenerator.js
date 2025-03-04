import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { EnvironmentalObjects } from './EnvironmentalObjects.js';
import { SpaceDebris } from './SpaceDebris.js';
import { CelestialBodies } from './CelestialBodies.js';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.chunkSize = 32;
        this.renderDistance = 3;
        this.maxHeight = 25; // Balanced height for varied terrain without extreme peaks
        this.noise2D = createNoise2D();
        this.lastPlayerChunk = { x: 0, z: 0 };
        
        // Biome settings
        this.biomes = {
            forest: {
                treeThreshold: 0.75,     // 25% chance for trees where suitable
                rockThreshold: 0.82,     // 18% chance for rocks
                shrubThreshold: 0.70,    // 30% chance for shrubs
                flowerThreshold: 0.65,   // 35% chance for flowers
                treeScale: 0.4,          // Larger trees in forests
                treeDensity: 5,          // More trees
                groundColor: 0x3b7d4f,   // Forest green
                heightBonus: 1.0         // Slight height bonus
            },
            plains: {
                treeThreshold: 0.92,     // 8% chance for trees (sparse)
                rockThreshold: 0.88,     // 12% chance for rocks
                shrubThreshold: 0.80,    // 20% chance for shrubs
                flowerThreshold: 0.70,   // 30% chance for flowers (lots of flowers)
                treeScale: 0.35,         // Normal trees
                treeDensity: 2,          // Few trees
                groundColor: 0x5ba855,   // Lighter green
                heightBonus: 0.0         // No height bonus
            },
            hills: {
                treeThreshold: 0.85,     // 15% chance for trees (medium)
                rockThreshold: 0.78,     // 22% chance for rocks (more rocks)
                shrubThreshold: 0.80,    // 20% chance for shrubs
                flowerThreshold: 0.75,   // 25% chance for flowers
                treeScale: 0.35,         // Normal trees
                treeDensity: 3,          // Medium tree density
                groundColor: 0x4a7446,   // Dark green
                heightBonus: 2.0         // Higher terrain
            },
            mountains: {
                treeThreshold: 0.90,     // 10% chance for trees (sparse)
                rockThreshold: 0.70,     // 30% chance for rocks (lots of rocks)
                shrubThreshold: 0.85,    // 15% chance for shrubs (less vegetation)
                flowerThreshold: 0.85,   // 15% chance for flowers (sparse)
                treeScale: 0.30,         // Smaller trees at altitude
                treeDensity: 2,          // Few trees
                groundColor: 0x6b6b6b,   // Gray
                heightBonus: 5.0         // Much higher terrain
            },
            beach: {
                treeThreshold: 0.95,     // 5% chance for trees (very sparse)
                rockThreshold: 0.92,     // 8% chance for rocks
                shrubThreshold: 0.90,    // 10% chance for shrubs
                flowerThreshold: 0.85,   // 15% chance for flowers
                treeScale: 0.3,          // Smaller trees
                treeDensity: 1,          // Very few trees
                groundColor: 0xdcd28c,   // Sand color
                heightBonus: -0.5        // Lower terrain
            },
            underwater: {
                heightBonus: 0.0         // No height bonus for underwater
            }
        };
        
        // Initialize environmental objects
        this.environmentalObjects = new EnvironmentalObjects(scene);
        this.environmentalObjects.setBiomes(this.biomes);
        
        // Materials
        this.materials = {
            grass: new THREE.MeshStandardMaterial({ 
                color: 0x3b7d4f,
                roughness: 0.8,
                metalness: 0.2
            }),
            dirt: new THREE.MeshStandardMaterial({ 
                color: 0x6b5334,
                roughness: 0.7,
                metalness: 0.1
            }),
            stone: new THREE.MeshStandardMaterial({ 
                color: 0x7b7b7b,
                roughness: 0.6,
                metalness: 0.2
            }),
            sand: new THREE.MeshStandardMaterial({ 
                color: 0xe6d59e,
                roughness: 0.9,
                metalness: 0.0
            }),
            snow: new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.1
            }),
            water: new THREE.MeshStandardMaterial({ 
                color: 0x3366aa,
                roughness: 0.2,
                metalness: 0.3,
                transparent: true,
                opacity: 0.8
            })
        };
        
        // Space parameters
        this.maxDebrisChunks = 10; // Maximum number of debris chunks to keep in memory
        this.debrisChunkSize = 200; // Size of each debris chunk
        this.debrisViewDistance = 500; // Distance to load debris chunks
        
        // Create space debris manager
        this.spaceDebris = new SpaceDebris(scene);
        
        // Create celestial bodies (planets, stars, etc.)
        this.celestialBodies = new CelestialBodies(scene);
        
        // Starfield
        this.createStarfield();
        
        // Particle systems for cosmic dust
        this.createCosmicDust();
        
        // Distant planets and galaxies that form the skybox
        this.createDistantCelestialObjects();
    }

    generateTerrain() {
        // Initialize space environment
        this.generateInitialDebrisChunks();
    }

    generateInitialChunks() {
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                this.generateChunk(x, z);
            }
        }
    }

    updateChunks(playerPosition) {
        // Calculate which chunk the player is in
        const chunkX = Math.floor(playerPosition.x / this.debrisChunkSize);
        const chunkY = Math.floor(playerPosition.y / this.debrisChunkSize);
        const chunkZ = Math.floor(playerPosition.z / this.debrisChunkSize);
        
        // Check if we need to load new chunks - sparse distribution
        // Only generate a chunk with 30% probability to avoid grid patterns
        for (let x = chunkX - 1; x <= chunkX + 1; x++) {
            for (let y = chunkY - 1; y <= chunkY + 1; y++) {
                for (let z = chunkZ - 1; z <= chunkZ + 1; z++) {
                    const chunkKey = `${x},${y},${z}`;
                    
                    // Skip origin chunk check since we always want that one
                    const isOriginChunk = (x === 0 && y === 0 && z === 0);
                    
                    // Calculate chunk center
                    const chunkCenterX = (x + 0.5) * this.debrisChunkSize;
                    const chunkCenterY = (y + 0.5) * this.debrisChunkSize;
                    const chunkCenterZ = (z + 0.5) * this.debrisChunkSize;
                    
                    // Calculate distance from origin (in game units)
                    const distanceFromOrigin = Math.sqrt(
                        chunkCenterX * chunkCenterX + 
                        chunkCenterY * chunkCenterY + 
                        chunkCenterZ * chunkCenterZ
                    );
                    
                    // Load chunk if it doesn't exist and passes random selection
                    if (!this.chunks.has(chunkKey)) {
                        // Always load origin chunk, but for others, use probability based on distance
                        if (isOriginChunk || 
                           (Math.random() < 0.3 && distanceFromOrigin > this.debrisChunkSize * 2)) {
                            this.generateDebrisChunk(x, y, z);
                        }
                    }
                }
            }
        }
        
        // Unload distant chunks
        const unloadDistanceSquared = Math.pow(this.debrisViewDistance * 1.2, 2);
        
        // Track chunks to remove
        const chunksToRemove = [];
        
        this.chunks.forEach((chunk, key) => {
            const [x, y, z] = key.split(',').map(Number);
            const chunkCenterX = (x + 0.5) * this.debrisChunkSize;
            const chunkCenterY = (y + 0.5) * this.debrisChunkSize;
            const chunkCenterZ = (z + 0.5) * this.debrisChunkSize;
            
            const distanceSquared = 
                Math.pow(playerPosition.x - chunkCenterX, 2) +
                Math.pow(playerPosition.y - chunkCenterY, 2) +
                Math.pow(playerPosition.z - chunkCenterZ, 2);
            
            if (distanceSquared > unloadDistanceSquared) {
                chunksToRemove.push(key);
            }
        });
        
        // Remove distant chunks
        for (const key of chunksToRemove) {
            this.removeDebrisChunk(key);
        }
        
        // Update moving debris and particles based on player position
        this.updateSpaceEffects(playerPosition);
    }

    generateChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Don't regenerate existing chunks
        if (this.chunks.has(chunkKey)) {
            return;
        }
        
        // Create geometry for the chunk
        const geometry = new THREE.PlaneGeometry(
            this.chunkSize, 
            this.chunkSize, 
            this.chunkSize - 1, 
            this.chunkSize - 1
        );
        
        // Important: Do NOT rotate the geometry yet - we need to modify heights first
        // We'll rotate after setting heights
        
        // Get vertices and modify their height based on noise
        const vertices = geometry.attributes.position.array;
        const worldOffsetX = chunkX * this.chunkSize;
        const worldOffsetZ = chunkZ * this.chunkSize;
        
        // Material array for different terrain types
        const materials = [];
        
        // Store height data for placement of environmental objects
        const heightData = [];
        const biomeData = [];
        const verticesPerRow = this.chunkSize; // The grid size matches chunkSize
        
        // Island parameters
        const waterLevel = 0.0;      // Set water level at 0 for clarity
        const beachHeight = 0.5;     // Beach extends just above water
        const islandRadius = 40.0;   // Size of the main island
        const islandFalloff = 20.0;  // How quickly the island drops to water
        const smallIslandCount = 3;  // Number of smaller islands
        const smallIslandRadius = 15.0; // Size of smaller islands
        
        // Island centers - main island at origin, smaller islands around it
        const islands = [
            { x: 0, z: 0, radius: islandRadius, height: 12.0 } // Main island
        ];
        
        // Generate smaller islands with random positions
        for (let i = 0; i < smallIslandCount; i++) {
            // Random angle and distance from main island
            const angle = Math.random() * Math.PI * 2;
            const distance = islandRadius * 1.5 + Math.random() * islandRadius * 1.5;
            
            // Calculate position
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Add island with random radius and height
            islands.push({
                x: x,
                z: z,
                radius: smallIslandRadius * (0.5 + Math.random()),
                height: 6.0 + Math.random() * 4.0
            });
        }
        
        // Apply height modifications to vertices
        // Note: For a plane geometry before rotation, Y is the height (not Z)
        for (let i = 0; i < vertices.length; i += 3) {
            // For an unrotated plane, X and Z are the horizontal coordinates
            const x = vertices[i] + worldOffsetX;
            const z = vertices[i + 2] + worldOffsetZ;
            
            // Calculate distance to each island center and find the closest one
            let closestIsland = null;
            let minDistance = Infinity;
            let islandInfluence = 0;
            
            for (const island of islands) {
                const dx = x - island.x;
                const dz = z - island.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // Calculate influence of this island (1 at center, 0 beyond radius)
                // Use a quadratic falloff for smoother island edges
                const normalizedDist = Math.min(1.0, distance / (island.radius + islandFalloff));
                const influence = 1.0 - (normalizedDist * normalizedDist);
                
                // If this island has more influence, it becomes the closest
                if (influence > islandInfluence) {
                    islandInfluence = influence;
                    closestIsland = island;
                    minDistance = distance;
                }
            }
            
            // Multi-layered noise approach for terrain details
            const detailScale = 0.05;
            const mediumScale = 0.02;
            const largeScale = 0.008;
            
            // Generate noise at different scales
            const largeNoise = (this.noise2D(x * largeScale, z * largeScale) + 1) * 0.5;
            const mediumNoise = (this.noise2D(x * mediumScale, z * mediumScale) + 1) * 0.5;
            const detailNoise = (this.noise2D(x * detailScale, z * detailScale) + 1) * 0.5;
            
            // Biome noise for vegetation distribution
            const biomeNoise = (this.noise2D(x * 0.008, z * 0.008) + 1) * 0.5;
            
            // Base height calculation
            let height;
            let biome;
            
            if (islandInfluence > 0) {
                // We're on or near an island
                
                // Calculate height based on distance from island center
                // Higher at center, lower at edges
                const baseHeight = closestIsland.height * islandInfluence * islandInfluence;
                
                // Add noise for natural terrain
                const noiseHeight = 
                    largeNoise * 2.0 +   // Large rolling hills
                    mediumNoise * 1.0 +  // Medium details
                    detailNoise * 0.5;   // Small details
                
                // Combine base height with noise
                // Stronger noise influence near the center, less at the edges
                height = baseHeight + noiseHeight * islandInfluence;
                
                // Determine biome based on height and noise
                if (height < beachHeight + 0.5) {
                    biome = 'beach';
                } else if (biomeNoise < 0.3) {
                    biome = 'forest';
                } else if (biomeNoise < 0.6) {
                    biome = 'plains';
                } else if (biomeNoise < 0.8 || height > 8) {
                    biome = 'hills';
                } else {
                    biome = 'mountains';
                }
                
                // Apply biome-specific height adjustments
                const biomeHeightBonus = this.biomes[biome].heightBonus;
                height += biomeHeightBonus;
                
                // Ensure beach areas are flatter
                if (biome === 'beach') {
                    height = Math.min(height, beachHeight + 0.5);
                }
                
                // Create mountain peaks on the main island
                if (closestIsland === islands[0] && minDistance < islandRadius * 0.3 && biome === 'mountains') {
                    const peakNoise = (this.noise2D(x * 0.03, z * 0.03) + 1) * 0.5;
                    height += peakNoise * peakNoise * 5.0;
                    biome = 'mountains';
                }
            } else {
                // We're in the ocean
                biome = 'underwater';
                
                // Underwater terrain - gentle slopes with occasional deeper areas
                const underwaterNoise = (this.noise2D(x * 0.01, z * 0.01) + 1) * 0.5;
                height = waterLevel - 1.0 - underwaterNoise * 1.5;
            }
            
            // Clamp the height to prevent extreme values
            height = Math.max(-5, Math.min(this.maxHeight, height));
            
            // Set vertex height (Y coordinate for unrotated plane)
            vertices[i + 1] = height;
            
            // Store height and biome type for environmental objects
            heightData.push(height);
            biomeData.push(biome);
            
            // Determine terrain type based on height and biome
            let material;
            if (height < waterLevel) {
                material = this.materials.water; // Underwater
            } else if (height < beachHeight) {
                material = this.materials.sand; // Beach
            } else if (biome === 'mountains' && height > 8) {
                if (height > 12) {
                    material = this.materials.snow; // Snowy peaks
                } else {
                    material = this.materials.stone; // Rocky mountains
                }
            } else if (biome === 'forest') {
                material = this.materials.grass; // Forest floor
            } else if (biome === 'hills') {
                material = this.materials.grass; // Hill grass
            } else {
                material = this.materials.grass; // Default to grass
            }
            
            materials.push(material);
        }
        
        // Now rotate the geometry to be horizontal AFTER setting heights
        geometry.rotateX(-Math.PI / 2);
        
        // Update the geometry
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Create mesh with the dominant material
        const dominantMaterial = this.getMostFrequentMaterial(materials);
        const mesh = new THREE.Mesh(geometry, dominantMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        
        // Position the chunk in the world
        mesh.position.set(worldOffsetX, 0, worldOffsetZ);
        
        // Name the chunk for easier identification
        mesh.name = `terrain-${chunkKey}`;
        
        // Store the chunk
        this.chunks.set(chunkKey, mesh);
        
        // Add to scene
        this.scene.add(mesh);
        
        // Add environmental objects based on biome data
        this.environmentalObjects.populateChunk(chunkX, chunkZ, this.chunkSize, heightData, biomeData);
        
        return mesh;
    }

    getMostFrequentMaterial(materials) {
        const counts = {};
        let maxCount = 0;
        let dominantMaterial = this.materials.grass;
        
        materials.forEach(material => {
            const key = material.uuid;
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] > maxCount) {
                maxCount = counts[key];
                dominantMaterial = material;
            }
        });
        
        return dominantMaterial;
    }

    addWaterPlane() {
        // Remove existing water plane if any
        if (this.waterMesh) {
            this.scene.remove(this.waterMesh);
            this.waterMesh.geometry.dispose();
            this.waterMesh.material.dispose();
        }
        
        // Create a water plane
        const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
        
        // Rotate the plane to be horizontal
        waterGeometry.rotateX(-Math.PI / 2);
        
        // Slightly transparent blue material for water
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x0066ff,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            metalness: 0.2,
        });
        
        // Create mesh
        this.waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
        this.waterMesh.name = 'water';
        
        // Position the water plane at the water level (0)
        this.waterMesh.position.y = 0.0;
        
        // Mark as water for collision detection
        this.waterMesh.userData.isWater = true;
        
        // Receive shadows
        this.waterMesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(this.waterMesh);
    }

    generateInitialDebrisChunks() {
        // Create only a sparse asteroid field around the origin for gameplay
        this.generateDebrisChunk(0, 0, 0);
        
        // Generate a few random chunks nearby for more natural distribution
        // This avoids the "square pattern" of debris in the middle of space
        const randomChunks = 5; // Reduced from larger grid to avoid square pattern
        
        for (let i = 0; i < randomChunks; i++) {
            // Generate random positions in a sphere around origin
            const angle = Math.random() * Math.PI * 2;
            const distance = 1 + Math.random() * 2; // Distance in chunk units
            
            const x = Math.round(Math.cos(angle) * distance);
            const z = Math.round(Math.sin(angle) * distance);
            const y = Math.round((Math.random() - 0.5) * 2);
            
            // Skip if it's the origin chunk (already created)
            if (!(x === 0 && y === 0 && z === 0)) {
                this.generateDebrisChunk(x, y, z);
            }
        }
    }

    generateDebrisChunk(chunkX, chunkY, chunkZ) {
        const chunkKey = `${chunkX},${chunkY},${chunkZ}`;
        
        // Don't regenerate existing chunks
        if (this.chunks.has(chunkKey)) {
            return;
        }
        
        // Calculate world space coordinates for this chunk
        const worldOffsetX = chunkX * this.debrisChunkSize;
        const worldOffsetY = chunkY * this.debrisChunkSize;
        const worldOffsetZ = chunkZ * this.debrisChunkSize;
        
        // Create a group for all objects in this chunk
        const chunkGroup = new THREE.Group();
        chunkGroup.name = `space-chunk-${chunkKey}`;
        chunkGroup.position.set(
            worldOffsetX + this.debrisChunkSize / 2, 
            worldOffsetY + this.debrisChunkSize / 2, 
            worldOffsetZ + this.debrisChunkSize / 2
        );
        
        // Generate space debris in this chunk
        this.generateSpaceDebris(chunkGroup, chunkX, chunkY, chunkZ);
        
        // Add the chunk to the scene
        this.scene.add(chunkGroup);
        
        // Store the chunk
        this.chunks.set(chunkKey, chunkGroup);
        
        // Limit the number of chunks
        if (this.chunks.size > this.maxDebrisChunks) {
            let oldestKey = null;
            
            // Find the oldest chunk that's not one of the 9 around the player
            for (const key of this.chunks.keys()) {
                const [x, y, z] = key.split(',').map(Number);
                if (Math.abs(x - chunkX) > 1 || Math.abs(y - chunkY) > 1 || Math.abs(z - chunkZ) > 1) {
                    oldestKey = key;
                    break;
                }
            }
            
            // Remove the oldest chunk
            if (oldestKey) {
                this.removeDebrisChunk(oldestKey);
            }
        }
        
        return chunkGroup;
    }

    generateSpaceDebris(chunkGroup, chunkX, chunkY, chunkZ) {
        // Parameters for debris generation - significantly reduced
        const isOriginChunk = chunkX === 0 && chunkY === 0 && chunkZ === 0;
        
        // Reduced base debris count
        let debrisCount = isOriginChunk ? 
            Math.floor(8 + Math.random() * 12) : // 8-20 pieces in origin for gameplay
            Math.floor(3 + Math.random() * 5);   // 3-8 pieces elsewhere
        
        // Calculate distance from origin in chunk coordinates
        const distanceFromOrigin = Math.sqrt(chunkX * chunkX + chunkY * chunkY + chunkZ * chunkZ);
        
        // Get noise value for this chunk to determine density
        const chunkNoise = (this.noise2D(chunkX * 0.5, chunkZ * 0.5) + 1) * 0.5;
        
        // Asteroid field probability decreases with distance from origin
        const asteroidFieldThreshold = isOriginChunk ? 0 : 0.75;
        const isDebrisField = chunkNoise > asteroidFieldThreshold && distanceFromOrigin < 5;
        
        // For asteroid fields, add more debris but still less than before
        if (isDebrisField) {
            debrisCount = Math.floor(debrisCount * 1.5);
        }
        
        // Generate debris 
        for (let i = 0; i < debrisCount; i++) {
            let x, y, z;
            
            if (isOriginChunk) {
                // For origin chunk, concentrate debris around a central point
                // but with a larger minimum radius to avoid cluttering player start
                const radius = 30 + Math.random() * 60; // Start further out
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                x = radius * Math.sin(phi) * Math.cos(theta);
                y = radius * Math.sin(phi) * Math.sin(theta);
                z = radius * Math.cos(phi);
            } else {
                // Random position within chunk but with tendency to cluster
                // Use simplex noise to create natural clustering, avoiding grid patterns
                const clusterNoise = (this.noise2D(i * 0.1, (chunkX + chunkZ) * 0.2) + 1) * 0.5;
                const clusterRadius = (clusterNoise * 0.6 + 0.2) * this.debrisChunkSize;
                
                // Random angle
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                // Position within the radius, centered within chunk
                x = clusterRadius * Math.sin(phi) * Math.cos(theta);
                y = clusterRadius * Math.sin(phi) * Math.sin(theta);
                z = clusterRadius * Math.cos(phi);
            }
            
            // Use noise to create clusters and avoid uniform distribution
            const localNoise = this.noise2D(x * 0.01 + chunkX, z * 0.01 + chunkZ);
            
            // Only place debris if noise value is favorable or it's a critical gameplay area
            if (localNoise > -0.2 || isDebrisField || isOriginChunk) {
                // Choose debris type based on noise and distance
                let debrisType;
                const typeRoll = Math.random();
                
                if (isOriginChunk) {
                    // Origin has more asteroids for gameplay
                    if (typeRoll < 0.65) {
                        debrisType = 'asteroid';
                    } else if (typeRoll < 0.9) {
                        debrisType = 'metalDebris';
                    } else {
                        debrisType = 'ice';
                    }
                } else if (distanceFromOrigin < 3) {
                    // Near origin has mixed debris
                    if (typeRoll < 0.5) {
                        debrisType = 'asteroid';
                    } else if (typeRoll < 0.8) {
                        debrisType = 'metalDebris';
                    } else {
                        debrisType = 'ice';
                    }
                } else {
                    // Far debris has more ice and less metal
                    if (typeRoll < 0.4) {
                        debrisType = 'asteroid';
                    } else if (typeRoll < 0.6) {
                        debrisType = 'metalDebris';
                    } else {
                        debrisType = 'ice';
                    }
                }
                
                // Add debris to the chunk
                const debrisObject = this.spaceDebris.createDebris(debrisType);
                
                // Position within chunk
                debrisObject.position.set(x, y, z);
                
                // Random rotation
                debrisObject.rotation.set(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                );
                
                // Random scale (smaller for debris, larger for asteroids)
                let scale;
                if (debrisType === 'asteroid') {
                    scale = 0.5 + Math.random() * 4.5;
                } else if (debrisType === 'ice') {
                    scale = 0.3 + Math.random() * 2.0;
                } else {
                    scale = 0.2 + Math.random() * 1.0;
                }
                
                debrisObject.scale.set(scale, scale, scale);
                
                // Add slight random rotation for animation
                debrisObject.userData.rotationSpeed = {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.01
                };
                
                // Drift velocity - slower for better gameplay
                debrisObject.userData.drift = {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.01
                };
                
                // Add to group
                chunkGroup.add(debrisObject);
            }
        }
    }

    removeDebrisChunk(chunkKey) {
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
            // Remove from scene
            this.scene.remove(chunk);
            
            // Dispose geometries and materials
            chunk.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            
            // Remove from map
            this.chunks.delete(chunkKey);
        }
    }

    updateSpaceEffects(playerPosition) {
        // Update cosmic dust to follow player
        if (this.cosmicDust) {
            this.cosmicDust.position.copy(playerPosition);
        }
        
        // Animate debris rotation and drift
        this.chunks.forEach((chunk) => {
            chunk.children.forEach((debrisObject) => {
                if (debrisObject.userData.rotationSpeed) {
                    // Apply rotation
                    debrisObject.rotation.x += debrisObject.userData.rotationSpeed.x;
                    debrisObject.rotation.y += debrisObject.userData.rotationSpeed.y;
                    debrisObject.rotation.z += debrisObject.userData.rotationSpeed.z;
                }
                
                if (debrisObject.userData.drift) {
                    // Apply drift
                    debrisObject.position.x += debrisObject.userData.drift.x;
                    debrisObject.position.y += debrisObject.userData.drift.y;
                    debrisObject.position.z += debrisObject.userData.drift.z;
                    
                    // Keep debris within chunk bounds (with some margin)
                    const margin = this.debrisChunkSize * 0.4;
                    const halfSize = this.debrisChunkSize / 2;
                    
                    if (Math.abs(debrisObject.position.x) > halfSize - margin) {
                        debrisObject.userData.drift.x *= -1; // Reverse direction
                    }
                    
                    if (Math.abs(debrisObject.position.y) > halfSize - margin) {
                        debrisObject.userData.drift.y *= -1;
                    }
                    
                    if (Math.abs(debrisObject.position.z) > halfSize - margin) {
                        debrisObject.userData.drift.z *= -1;
                    }
                }
            });
        });
    }

    createStarfield() {
        // Create a starfield with thousands of stars at different distances
        const starCount = 10000;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        
        // Generate random star positions in a spherical distribution
        for (let i = 0; i < starCount; i++) {
            // Use spherical coordinates for even distribution around the player
            const radius = 500 + Math.random() * 2500; // Stars between 500 and 3000 units away
            const theta = Math.random() * Math.PI * 2; // Horizontal angle
            const phi = Math.acos(2 * Math.random() - 1); // Vertical angle for uniform distribution
            
            // Convert spherical to Cartesian coordinates
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            starPositions[i * 3] = x;
            starPositions[i * 3 + 1] = y;
            starPositions[i * 3 + 2] = z;
            
            // Randomize star colors (mostly white with some colored stars)
            const colorChoice = Math.random();
            if (colorChoice < 0.7) {
                // White/blue-white stars (common)
                starColors[i * 3] = 0.9 + Math.random() * 0.1; // R
                starColors[i * 3 + 1] = 0.9 + Math.random() * 0.1; // G
                starColors[i * 3 + 2] = 1.0; // B
            } else if (colorChoice < 0.8) {
                // Red stars
                starColors[i * 3] = 1.0; // R
                starColors[i * 3 + 1] = 0.3 + Math.random() * 0.3; // G
                starColors[i * 3 + 2] = 0.3 + Math.random() * 0.2; // B
            } else if (colorChoice < 0.9) {
                // Yellow stars
                starColors[i * 3] = 1.0; // R
                starColors[i * 3 + 1] = 0.9 + Math.random() * 0.1; // G
                starColors[i * 3 + 2] = 0.4 + Math.random() * 0.3; // B
            } else {
                // Blue stars
                starColors[i * 3] = 0.4 + Math.random() * 0.3; // R
                starColors[i * 3 + 1] = 0.6 + Math.random() * 0.3; // G
                starColors[i * 3 + 2] = 1.0; // B
            }
            
            // Randomize star sizes (mostly small with a few larger ones)
            const sizeRandom = Math.random();
            if (sizeRandom < 0.8) {
                starSizes[i] = 0.5 + Math.random() * 0.5; // Small stars
            } else if (sizeRandom < 0.95) {
                starSizes[i] = 1.0 + Math.random() * 1.0; // Medium stars
            } else {
                starSizes[i] = 2.0 + Math.random() * 2.0; // Large stars
            }
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.starfield.name = 'starfield';
        this.scene.add(this.starfield);
    }
    
    createCosmicDust() {
        // Create particle systems for cosmic dust
        const dustCount = 2000;
        const dustGeometry = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        const dustColors = new Float32Array(dustCount * 3);
        const dustSizes = new Float32Array(dustCount);
        
        // Generate random dust particles in a local cloud formation
        for (let i = 0; i < dustCount; i++) {
            // Use a larger cube distribution for dust around the player
            const size = 300;
            const x = (Math.random() - 0.5) * size;
            const y = (Math.random() - 0.5) * size;
            const z = (Math.random() - 0.5) * size;
            
            dustPositions[i * 3] = x;
            dustPositions[i * 3 + 1] = y;
            dustPositions[i * 3 + 2] = z;
            
            // Dust colors (blue/purple tint for space nebula effect)
            dustColors[i * 3] = 0.3 + Math.random() * 0.4; // R
            dustColors[i * 3 + 1] = 0.2 + Math.random() * 0.3; // G
            dustColors[i * 3 + 2] = 0.6 + Math.random() * 0.4; // B
            
            // Small dust particles
            dustSizes[i] = 0.5 + Math.random() * 1.5;
        }
        
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
        dustGeometry.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));
        
        const dustMaterial = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });
        
        this.cosmicDust = new THREE.Points(dustGeometry, dustMaterial);
        this.cosmicDust.name = 'cosmic-dust';
        this.scene.add(this.cosmicDust);
    }
    
    createDistantCelestialObjects() {
        // Create distant planets and galaxies
        this.celestialBodies.createDistantPlanets();
        this.celestialBodies.createDistantGalaxy();
        this.celestialBodies.createNebula();
    }
} 