import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class EnvironmentalObjects {
    constructor(scene) {
        this.scene = scene;
        this.objectsCache = new Map(); // Map to store objects by chunk key
        this.noise2D = createNoise2D(); // For distribution of objects
        
        // Store models for reuse
        this.models = {
            trees: [],
            rocks: [],
            shrubs: [],
            flowers: []
        };
        
        // Default biomes if not set from WorldGenerator
        this.biomes = {
            forest: {
                treeThreshold: 0.75,
                rockThreshold: 0.82,
                shrubThreshold: 0.70,
                flowerThreshold: 0.65,
                treeScale: 0.4,
                treeDensity: 5
            },
            plains: {
                treeThreshold: 0.92,
                rockThreshold: 0.88,
                shrubThreshold: 0.80,
                flowerThreshold: 0.70,
                treeScale: 0.35,
                treeDensity: 2
            }
        };
        
        // Create object models
        this.createTreeModels();
        this.createRockModels();
        this.createShrubModels();
        this.createFlowerModels();
    }
    
    // Set biome configuration from WorldGenerator
    setBiomes(biomes) {
        this.biomes = biomes;
    }
    
    createTreeModels() {
        // Create different types of trees
        
        // Conifer Tree
        const coniferTree = this.createConiferTree();
        this.models.trees.push(coniferTree);
        
        // Broadleaf Tree
        const broadleafTree = this.createBroadleafTree();
        this.models.trees.push(broadleafTree);
        
        // Dead Tree
        const deadTree = this.createDeadTree();
        this.models.trees.push(deadTree);
    }
    
    createConiferTree() {
        const treeGroup = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 3, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.position.y = 1.5;
        treeGroup.add(trunk);
        
        // Tree leaves (conical shapes stacked)
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d4c1e,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Bottom layer (wider)
        const leafGeometry1 = new THREE.ConeGeometry(1.5, 2, 8);
        const leaves1 = new THREE.Mesh(leafGeometry1, leafMaterial);
        leaves1.castShadow = true;
        leaves1.receiveShadow = true;
        leaves1.position.y = 2.5;
        treeGroup.add(leaves1);
        
        // Middle layer
        const leafGeometry2 = new THREE.ConeGeometry(1.2, 1.8, 8);
        const leaves2 = new THREE.Mesh(leafGeometry2, leafMaterial);
        leaves2.castShadow = true;
        leaves2.receiveShadow = true;
        leaves2.position.y = 3.8;
        treeGroup.add(leaves2);
        
        // Top layer (smaller)
        const leafGeometry3 = new THREE.ConeGeometry(0.8, 1.5, 8);
        const leaves3 = new THREE.Mesh(leafGeometry3, leafMaterial);
        leaves3.castShadow = true;
        leaves3.receiveShadow = true;
        leaves3.position.y = 5;
        treeGroup.add(leaves3);
        
        return treeGroup;
    }
    
    createBroadleafTree() {
        const treeGroup = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 2.5, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.position.y = 1.25;
        treeGroup.add(trunk);
        
        // Tree leaves (spherical crown)
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4ca657,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Main foliage
        const leafGeometry = new THREE.SphereGeometry(1.8, 8, 6);
        const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        leaves.position.y = 3.5;
        
        // Make the foliage a bit more irregular
        const vertices = leaves.geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const noise = (Math.random() - 0.5) * 0.3;
            vertices[i] += noise;
            vertices[i + 1] += noise;
            vertices[i + 2] += noise;
        }
        leaves.geometry.attributes.position.needsUpdate = true;
        leaves.geometry.computeVertexNormals();
        
        treeGroup.add(leaves);
        
        return treeGroup;
    }
    
    createDeadTree() {
        const treeGroup = new THREE.Group();
        
        // Dead tree trunk (taller and thinner)
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.3, 4, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5c5c5c,
            roughness: 1.0,
            metalness: 0.0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.position.y = 2;
        treeGroup.add(trunk);
        
        // Add some branches
        this.addBranch(treeGroup, 0.1, 1.2, 0.7, 0.3, 40);
        this.addBranch(treeGroup, 0.1, 1.0, -0.5, 0.8, -30);
        this.addBranch(treeGroup, 0.1, 0.8, 0.0, 1.2, 85);
        
        return treeGroup;
    }
    
    addBranch(group, radius, length, x, y, angle) {
        const branchGeometry = new THREE.CylinderGeometry(radius * 0.7, radius, length, 5);
        const branchMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5c5c5c,
            roughness: 1.0,
            metalness: 0.0
        });
        
        const branch = new THREE.Mesh(branchGeometry, branchMaterial);
        branch.castShadow = true;
        
        // Position at the attachment point
        branch.position.set(x, y + 2, 0);
        
        // Rotate to the specified angle (convert to radians)
        branch.rotation.z = angle * (Math.PI / 180);
        
        // Move to position so one end is at the attachment point
        branch.translateY(length/2);
        
        group.add(branch);
    }
    
    createRockModels() {
        // Create different types of rocks
        
        // Large Boulder
        const boulder = this.createBoulder();
        this.models.rocks.push(boulder);
        
        // Medium Rock Cluster
        const rockCluster = this.createRockCluster();
        this.models.rocks.push(rockCluster);
        
        // Small Rocks
        const smallRock = this.createSmallRock();
        this.models.rocks.push(smallRock);
    }
    
    createBoulder() {
        const rockGroup = new THREE.Group();
        
        // Main boulder
        const geometry = new THREE.SphereGeometry(1, 7, 5);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x7c7c7c,
            roughness: 0.9,
            metalness: 0.2
        });
        
        // Make the boulder irregular
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const noise = (Math.random() - 0.5) * 0.3;
            vertices[i] += noise;
            vertices[i + 1] += noise * 0.8; // Less distortion on height
            vertices[i + 2] += noise;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        const boulder = new THREE.Mesh(geometry, material);
        boulder.castShadow = true;
        boulder.receiveShadow = true;
        boulder.position.y = 0.8;
        
        // Slightly random rotation
        boulder.rotation.y = Math.random() * Math.PI * 2;
        
        rockGroup.add(boulder);
        
        return rockGroup;
    }
    
    createRockCluster() {
        const rockGroup = new THREE.Group();
        
        // Create several smaller rocks in a cluster
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x8a8a8a,
            roughness: 0.9,
            metalness: 0.15
        });
        
        // Add 3-5 rocks of varying sizes
        const rockCount = Math.floor(Math.random() * 3) + 3;
        
        for (let i = 0; i < rockCount; i++) {
            const size = 0.3 + Math.random() * 0.4;
            const geometry = new THREE.DodecahedronGeometry(size, 1);
            
            // Make each rock irregular
            const vertices = geometry.attributes.position.array;
            for (let j = 0; j < vertices.length; j += 3) {
                const noise = (Math.random() - 0.5) * 0.2;
                vertices[j] += noise;
                vertices[j + 1] += noise;
                vertices[j + 2] += noise;
            }
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();
            
            const rock = new THREE.Mesh(geometry, material);
            rock.castShadow = true;
            rock.receiveShadow = true;
            
            // Position within the cluster
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.5;
            rock.position.x = Math.cos(angle) * radius;
            rock.position.z = Math.sin(angle) * radius;
            rock.position.y = size * 0.8;
            
            // Random rotation
            rock.rotation.x = Math.random() * Math.PI;
            rock.rotation.y = Math.random() * Math.PI;
            rock.rotation.z = Math.random() * Math.PI;
            
            rockGroup.add(rock);
        }
        
        return rockGroup;
    }
    
    createSmallRock() {
        const rockGroup = new THREE.Group();
        
        // Small rock
        const geometry = new THREE.DodecahedronGeometry(0.3, 0);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x9a9a9a,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const rock = new THREE.Mesh(geometry, material);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.position.y = 0.2;
        
        // Random rotation
        rock.rotation.x = Math.random() * Math.PI;
        rock.rotation.y = Math.random() * Math.PI;
        rock.rotation.z = Math.random() * Math.PI;
        
        rockGroup.add(rock);
        
        return rockGroup;
    }
    
    createShrubModels() {
        // Create different types of shrubs
        
        // Bush
        const bush = this.createBush();
        this.models.shrubs.push(bush);
        
        // Small Bush
        const smallBush = this.createSmallBush();
        this.models.shrubs.push(smallBush);
        
        // Fern
        const fern = this.createFern();
        this.models.shrubs.push(fern);
    }
    
    createBush() {
        const bushGroup = new THREE.Group();
        
        // Bush foliage
        const geometry = new THREE.SphereGeometry(0.7, 8, 6);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x355e3b,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Make the bush irregular
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const noise = (Math.random() - 0.5) * 0.3;
            vertices[i] += noise;
            vertices[i + 1] += noise * 0.7;
            vertices[i + 2] += noise;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        const bush = new THREE.Mesh(geometry, material);
        bush.castShadow = true;
        bush.receiveShadow = true;
        bush.position.y = 0.4;
        
        bushGroup.add(bush);
        
        return bushGroup;
    }
    
    createSmallBush() {
        const bushGroup = new THREE.Group();
        
        // Small bush base
        const baseGeometry = new THREE.SphereGeometry(0.4, 8, 6);
        const baseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d4c1e,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Make the bush irregular
        const vertices = baseGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const noise = (Math.random() - 0.5) * 0.2;
            vertices[i] += noise;
            vertices[i + 1] += noise * 0.6;
            vertices[i + 2] += noise;
        }
        baseGeometry.attributes.position.needsUpdate = true;
        baseGeometry.computeVertexNormals();
        
        const bush = new THREE.Mesh(baseGeometry, baseMaterial);
        bush.castShadow = true;
        bush.receiveShadow = true;
        bush.position.y = 0.25;
        
        bushGroup.add(bush);
        
        return bushGroup;
    }
    
    createFern() {
        const fernGroup = new THREE.Group();
        
        // Create fern leaves
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a5f0b,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        // Add several fern leaves
        for (let i = 0; i < 12; i++) {
            const leafGeometry = new THREE.PlaneGeometry(0.3, 0.8, 2, 4);
            
            // Curve the leaf a bit
            const vertices = leafGeometry.attributes.position.array;
            for (let j = 0; j < vertices.length; j += 3) {
                const y = vertices[j + 1];
                vertices[j] += (y * y * 0.1) * (Math.random() * 0.5 + 0.5);
            }
            leafGeometry.attributes.position.needsUpdate = true;
            leafGeometry.computeVertexNormals();
            
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.castShadow = true;
            leaf.receiveShadow = true;
            
            // Position and rotate the leaf
            const angle = (i / 12) * Math.PI * 2;
            leaf.position.y = 0.1;
            leaf.rotation.y = angle;
            leaf.rotation.x = -Math.PI / 4; // Tilt upward
            
            fernGroup.add(leaf);
        }
        
        return fernGroup;
    }
    
    createFlowerModels() {
        // Create different types of flowers
        
        // Daisy-like flower
        const daisy = this.createDaisy();
        this.models.flowers.push(daisy);
        
        // Tall grass
        const tallGrass = this.createTallGrass();
        this.models.flowers.push(tallGrass);
        
        // Mushroom
        const mushroom = this.createMushroom();
        this.models.flowers.push(mushroom);
    }
    
    createDaisy() {
        const flowerGroup = new THREE.Group();
        
        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const stemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a5f0b,
            roughness: 0.8,
            metalness: 0.1
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.2;
        flowerGroup.add(stem);
        
        // Flower head
        const flowerGeometry = new THREE.SphereGeometry(0.08, 8, 6);
        const flowerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00,
            roughness: 0.8,
            metalness: 0.1
        });
        const flowerHead = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flowerHead.position.y = 0.45;
        flowerGroup.add(flowerHead);
        
        // Petals
        const petalMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        for (let i = 0; i < 8; i++) {
            const petalGeometry = new THREE.PlaneGeometry(0.15, 0.08, 1, 1);
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);
            
            const angle = (i / 8) * Math.PI * 2;
            petal.position.x = Math.cos(angle) * 0.1;
            petal.position.z = Math.sin(angle) * 0.1;
            petal.position.y = 0.45;
            petal.rotation.y = angle;
            petal.rotation.x = Math.PI / 2;
            
            flowerGroup.add(petal);
        }
        
        return flowerGroup;
    }
    
    createTallGrass() {
        const grassGroup = new THREE.Group();
        
        // Create several grass blades
        const grassMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4b8a3a,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        
        for (let i = 0; i < 7; i++) {
            const height = 0.3 + Math.random() * 0.2;
            const grassGeometry = new THREE.PlaneGeometry(0.05, height, 1, 4);
            
            // Add some curve to the blade
            const vertices = grassGeometry.attributes.position.array;
            for (let j = 0; j < vertices.length; j += 3) {
                const y = vertices[j + 1];
                const bend = Math.random() * 0.05;
                vertices[j] += y * bend;
            }
            grassGeometry.attributes.position.needsUpdate = true;
            grassGeometry.computeVertexNormals();
            
            const blade = new THREE.Mesh(grassGeometry, grassMaterial);
            blade.castShadow = true;
            blade.receiveShadow = true;
            
            // Position and rotate the blade
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.1;
            blade.position.x = Math.cos(angle) * radius;
            blade.position.z = Math.sin(angle) * radius;
            blade.position.y = height / 2;
            blade.rotation.y = Math.random() * Math.PI;
            
            grassGroup.add(blade);
        }
        
        return grassGroup;
    }
    
    createMushroom() {
        const mushroomGroup = new THREE.Group();
        
        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.03, 0.05, 0.15, 8);
        const stemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf0f0f0,
            roughness: 0.7,
            metalness: 0.1
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.075;
        stem.castShadow = true;
        stem.receiveShadow = true;
        mushroomGroup.add(stem);
        
        // Cap
        const capGeometry = new THREE.SphereGeometry(0.08, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xe53935, // Red mushroom
            roughness: 0.8,
            metalness: 0.1
        });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 0.16;
        cap.castShadow = true;
        cap.receiveShadow = true;
        
        // Add some white spots to the cap
        const spotMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.1
        });
        
        for (let i = 0; i < 5; i++) {
            const spotSize = 0.01 + Math.random() * 0.01;
            const spotGeometry = new THREE.SphereGeometry(spotSize, 4, 4);
            const spot = new THREE.Mesh(spotGeometry, spotMaterial);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.02 + Math.random() * 0.04;
            spot.position.x = Math.cos(angle) * radius;
            spot.position.z = Math.sin(angle) * radius;
            spot.position.y = 0.16 + (Math.random() * 0.03);
            
            cap.add(spot);
        }
        
        mushroomGroup.add(cap);
        
        return mushroomGroup;
    }
    
    // Method to populate a chunk with environmental objects
    populateChunk(chunkX, chunkZ, chunkSize, heightData, biomeData) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Skip if we've already populated this chunk
        if (this.objectsCache.has(chunkKey)) {
            return this.objectsCache.get(chunkKey);
        }
        
        const objects = new THREE.Group();
        objects.name = `env-objects-${chunkKey}`;
        
        // Cache the objects for this chunk immediately to prevent duplicate population
        this.objectsCache.set(chunkKey, objects);
        
        const worldOffsetX = chunkX * chunkSize;
        const worldOffsetZ = chunkZ * chunkSize;
        
        // Skip the chunk where player starts to prevent objects appearing around them
        const isStartingChunk = (chunkX === 0 && chunkZ === 0);
        const isPlayerStartArea = isStartingChunk && Math.abs(worldOffsetX) < 10 && Math.abs(worldOffsetZ) < 10;
        
        // Process the chunk into biome regions for more natural distribution
        const biomeRegions = this.analyzeBiomeRegions(biomeData, chunkSize);
        
        // Populate each biome region separately
        for (const biome in biomeRegions) {
            if (biome === 'underwater') continue; // Skip underwater regions
            
            const biomePositions = biomeRegions[biome];
            if (biomePositions.length === 0) continue;
            
            // Get biome-specific settings
            const biomeSettings = this.biomes[biome] || this.biomes.plains; // Default to plains if biome not found
            
            // Calculate how many objects to place based on biome type and region size
            const regionRatio = biomePositions.length / (chunkSize * chunkSize);
            
            // Adjust density based on biome type
            let densityMultiplier = 1.0;
            if (biome === 'forest') {
                densityMultiplier = 1.5; // More vegetation in forests
            } else if (biome === 'beach') {
                densityMultiplier = 0.3; // Sparse vegetation on beaches
            } else if (biome === 'mountains') {
                densityMultiplier = 0.5; // Less vegetation in mountains
            }
            
            // Calculate object counts
            const treeDensity = Math.max(1, Math.floor(biomeSettings.treeDensity * regionRatio * densityMultiplier));
            const rockDensity = Math.max(1, Math.floor(treeDensity * 1.5)); // More rocks than trees
            const shrubDensity = Math.max(1, Math.floor(treeDensity * 2.5)); // More shrubs than trees
            const flowerDensity = Math.max(2, Math.floor(treeDensity * 4)); // Many more flowers than trees
            
            // Use biome-specific noise scales
            const treeNoiseScale = 0.008;   // Relatively sparse tree distribution
            const rockNoiseScale = 0.012;   // Slightly more dense rocks
            const shrubNoiseScale = 0.015;  // More common shrubs
            const flowerNoiseScale = 0.02;  // Densest small vegetation
            
            // Reduce thresholds for islands to ensure enough vegetation
            const thresholdReduction = 0.05; // Make vegetation slightly more common
            
            // Use biome-specific thresholds from settings with island adjustment
            this.populateObjectsInBiome(
                objects, 
                this.models.trees, 
                treeDensity, 
                treeNoiseScale, 
                biomeSettings.treeThreshold - thresholdReduction, 
                worldOffsetX, 
                worldOffsetZ, 
                chunkSize, 
                heightData, 
                biomeData,
                biome,
                biomePositions,
                isPlayerStartArea
            );
            
            this.populateObjectsInBiome(
                objects, 
                this.models.rocks, 
                rockDensity, 
                rockNoiseScale, 
                biomeSettings.rockThreshold - thresholdReduction, 
                worldOffsetX, 
                worldOffsetZ, 
                chunkSize, 
                heightData, 
                biomeData,
                biome,
                biomePositions,
                isPlayerStartArea
            );
            
            this.populateObjectsInBiome(
                objects, 
                this.models.shrubs, 
                shrubDensity, 
                shrubNoiseScale, 
                biomeSettings.shrubThreshold - thresholdReduction, 
                worldOffsetX, 
                worldOffsetZ, 
                chunkSize, 
                heightData, 
                biomeData,
                biome,
                biomePositions,
                isPlayerStartArea
            );
            
            this.populateObjectsInBiome(
                objects, 
                this.models.flowers, 
                flowerDensity, 
                flowerNoiseScale, 
                biomeSettings.flowerThreshold - thresholdReduction, 
                worldOffsetX, 
                worldOffsetZ, 
                chunkSize, 
                heightData, 
                biomeData,
                biome,
                biomePositions,
                isPlayerStartArea
            );
        }
        
        // Add the objects group to the scene
        this.scene.add(objects);
        
        return objects;
    }
    
    // Analyze the biome data to group similar biomes together for more natural object placement
    analyzeBiomeRegions(biomeData, chunkSize) {
        const regions = {};
        const gridSize = Math.sqrt(biomeData.length);
        
        // Initialize region containers for each biome
        for (let i = 0; i < biomeData.length; i++) {
            const biome = biomeData[i];
            if (!regions[biome]) {
                regions[biome] = [];
            }
            
            // Calculate grid position
            const x = i % gridSize;
            const z = Math.floor(i / gridSize);
            
            // Store position information
            regions[biome].push({
                index: i,
                x: x,
                z: z,
                normalizedX: x / gridSize,
                normalizedZ: z / gridSize
            });
        }
        
        return regions;
    }
    
    // Place objects in a specific biome region
    populateObjectsInBiome(parent, modelList, maxObjects, noiseScale, threshold, worldOffsetX, worldOffsetZ, chunkSize, heightData, biomeData, targetBiome, biomePositions, isPlayerStartArea = false) {
        if (!modelList || modelList.length === 0 || maxObjects <= 0) return;
        
        const attemptPositions = maxObjects * 4; // Try more positions than we need
        let objectsPlaced = 0;
        
        // Calculate grid size from height data
        const gridSize = Math.sqrt(heightData.length);
        
        // Set of indices already used to avoid placing multiple objects in the same spot
        const usedIndices = new Set();
        
        // Pre-select positions for better efficiency
        const candidatePositions = biomePositions.filter(pos => !usedIndices.has(pos.index));
        
        // Shuffle candidate positions for more random placement
        for (let i = candidatePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidatePositions[i], candidatePositions[j]] = [candidatePositions[j], candidatePositions[i]];
        }
        
        // Visualize height points for debugging (remove in production)
        // this.addHeightMarkers(parent, heightData, gridSize, chunkSize);
        
        for (let attempt = 0; attempt < attemptPositions && objectsPlaced < maxObjects && candidatePositions.length > 0; attempt++) {
            // Get next candidate position
            const posIndex = attempt % candidatePositions.length;
            const position = candidatePositions[posIndex];
            
            // Skip if this position has already been used
            if (usedIndices.has(position.index)) continue;
            
            const localX = position.normalizedX * chunkSize;
            const localZ = position.normalizedZ * chunkSize;
            
            const worldX = worldOffsetX + localX;
            const worldZ = worldOffsetZ + localZ;
            
            // Skip objects in the player start area to prevent collisions
            if (isPlayerStartArea && modelList !== this.models.flowers) {
                // Allow only flowers in the immediate player start area
                continue;
            }
            
            // Add variation based on distance from origin
            const distFromOrigin = Math.sqrt(worldX * worldX + worldZ * worldZ);
            
            // More objects as you get farther from origin, but ensure some near the start
            const distanceBonus = Math.min(0.2, distFromOrigin / 500);
            
            // Use noise to determine if we should place an object here
            // This creates natural-looking clusters and empty spaces
            const noiseValue = (this.noise2D(worldX * noiseScale, worldZ * noiseScale) + 1) * 0.5;
            
            if (noiseValue > threshold - distanceBonus) {
                // Get the terrain height at this position
                const height = this.getHeightAt(localX, localZ, chunkSize, heightData, gridSize);
                
                // Skip if height data is invalid
                if (height === undefined || isNaN(height)) continue;
                
                // Get the biome type directly from biomeData for this position
                const biomeType = biomeData[position.index];
                
                // Ensure we're placing in the right biome
                if (biomeType !== targetBiome) continue;
                
                // Don't place objects in water - use the updated water level
                const waterLevel = 0.0; // Match the water level in WorldGenerator
                if (height <= waterLevel) continue;
                
                // Don't place on extremely steep slopes - enforce flat terrain for objects
                if (this.isSteepSlope(localX, localZ, chunkSize, heightData, gridSize)) continue;
                
                // Mark this position as used
                usedIndices.add(position.index);
                
                // Choose a model appropriate for the biome
                let model = this.selectModelForBiome(modelList, targetBiome);
                if (!model) continue;
                
                // Add collision detection to the model
                this.addCollisionProperties(model, modelList);
                
                // Position the object properly on the terrain
                // First position on XZ plane only
                model.position.set(localX, 0, localZ);
                
                // Set the y position based on object type to match terrain properly
                let yOffset = 0;
                if (modelList === this.models.trees) {
                    // Trees need to be placed with their base exactly at terrain level
                    yOffset = 0;
                } else if (modelList === this.models.rocks) {
                    // Rocks need to be partially embedded in the terrain for stability
                    yOffset = -0.15;
                } else if (modelList === this.models.shrubs) {
                    // Shrubs placed right at surface level
                    yOffset = 0;
                } else if (modelList === this.models.flowers) {
                    // Small plants and flowers placed at surface level
                    yOffset = 0;
                }
                
                // Now set the final Y position
                model.position.y = height + yOffset;
                
                // Debug visualization for height check (uncomment if needed)
                // this.addHeightMarker(parent, localX, height, localZ);
                
                // Add a slight random rotation on Y axis for natural look
                model.rotation.y = Math.random() * Math.PI * 2;
                
                // Make sure X and Z rotations are zeroed for proper gravity alignment
                model.rotation.x = 0;
                model.rotation.z = 0;
                
                // Get biome-specific scale
                const biomeSettings = this.biomes[targetBiome] || this.biomes.plains;
                
                // Adjust scale based on biome and object type
                let baseScale;
                if (modelList === this.models.trees) {
                    baseScale = biomeSettings.treeScale || 0.35;
                    // Vary tree sizes a bit for natural look
                    baseScale += Math.random() * 0.15;
                } else if (modelList === this.models.rocks) {
                    baseScale = 0.25 + Math.random() * 0.15;
                } else if (modelList === this.models.shrubs) {
                    baseScale = 0.2 + Math.random() * 0.15;
                } else {
                    baseScale = 0.15 + Math.random() * 0.15;
                }
                
                model.scale.set(baseScale, baseScale, baseScale);
                
                // Add a slight random scale variation to X and Z for more natural look
                // but keep Y scale consistent for proper terrain alignment
                const xzVariation = 0.9 + Math.random() * 0.2;
                model.scale.x *= xzVariation;
                model.scale.z *= xzVariation;
                
                // Add to parent
                parent.add(model);
                objectsPlaced++;
            }
        }
    }
    
    // Select an appropriate model for a given biome
    selectModelForBiome(modelList, biome) {
        if (!modelList || modelList.length === 0) {
            return null;
        }
        
        // Categorize models by their suitability for different biomes
        if (modelList === this.models.trees) {
            // For trees, use specific types based on biome
            if (biome === 'forest') {
                // Forests have mostly broadleaf trees with some conifers
                const forestModels = modelList.filter((_, index) => 
                    index % 3 === 1 || index % 3 === 0); // Broadleaf and conifer trees
                return forestModels[Math.floor(Math.random() * forestModels.length)].clone();
            } else if (biome === 'mountains') {
                // Mountains have mostly conifer trees
                const mountainModels = modelList.filter((_, index) => 
                    index % 3 === 0); // Conifer trees
                
                // If we have mountain-specific trees, use those, otherwise use any
                if (mountainModels.length > 0) {
                    return mountainModels[Math.floor(Math.random() * mountainModels.length)].clone();
                }
            } else if (biome === 'beach') {
                // Beaches might have palm trees or sparse vegetation
                // Just use whatever tree models we have but less frequently
                return modelList[Math.floor(Math.random() * modelList.length)].clone();
            }
        } else if (modelList === this.models.rocks) {
            // Mountains have more angular rocks, other biomes have rounder rocks
            if (biome === 'mountains') {
                // Try to find sharper rocks for mountains
                const mountainRocks = modelList.filter((_, index) => index % 2 === 0);
                if (mountainRocks.length > 0) {
                    return mountainRocks[Math.floor(Math.random() * mountainRocks.length)].clone();
                }
            } else if (biome === 'beach') {
                // Beaches have smaller, smoother rocks
                const beachRocks = modelList.filter((_, index) => index % 2 === 1);
                if (beachRocks.length > 0) {
                    return beachRocks[Math.floor(Math.random() * beachRocks.length)].clone();
                }
            }
        }
        
        // Default: just pick a random model from the list
        const modelIndex = Math.floor(Math.random() * modelList.length);
        return modelList[modelIndex].clone();
    }
    
    // Add collision detection properties to objects
    addCollisionProperties(model, modelList) {
        // Add a property to identify this as an environment object
        model.userData.isEnvironmentObject = true;
        
        // Set specific object type for collision handling
        if (modelList === this.models.trees) {
            model.userData.objectType = 'tree';
            // Create a simple collision box for the tree trunk
            const boundingBox = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            // Make the collision box just for the trunk
            model.userData.collisionRadius = size.x * 0.2;
        } else if (modelList === this.models.rocks) {
            model.userData.objectType = 'rock';
            // Rocks have nearly full-size collision
            const boundingBox = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            model.userData.collisionRadius = size.x * 0.4;
        } else if (modelList === this.models.shrubs) {
            model.userData.objectType = 'shrub';
            // Shrubs have minimal collision
            const boundingBox = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            model.userData.collisionRadius = size.x * 0.3;
        } else {
            model.userData.objectType = 'vegetation';
            // Small vegetation has no meaningful collision
            model.userData.collisionRadius = 0;
        }
        
        // Store original position for collision resolution
        model.userData.originalY = model.position.y;
    }
    
    getHeightAt(localX, localZ, chunkSize, heightData, gridSize) {
        if (!heightData || heightData.length === 0) return undefined;
        
        // Use passed gridSize or calculate it
        const gridSizeToUse = gridSize || Math.sqrt(heightData.length);
        
        // Convert local coordinates to grid indices with proper scaling
        // The -1 is critical here because the grid has one fewer cells than vertices
        const gridScale = (gridSizeToUse - 1) / chunkSize;
        const gridX = Math.floor(localX * gridScale);
        const gridZ = Math.floor(localZ * gridScale);
        
        // Get fractional part for interpolation
        const fracX = (localX * gridScale) - gridX;
        const fracZ = (localZ * gridScale) - gridZ;
        
        // Safety check for grid boundaries with extra margin
        if (gridX < 0 || gridX >= gridSizeToUse - 1 || gridZ < 0 || gridZ >= gridSizeToUse - 1) {
            return undefined;
        }
        
        // Get heights at the four corners of the grid cell
        const idx00 = gridZ * gridSizeToUse + gridX;
        const idx10 = gridZ * gridSizeToUse + (gridX + 1);
        const idx01 = (gridZ + 1) * gridSizeToUse + gridX;
        const idx11 = (gridZ + 1) * gridSizeToUse + (gridX + 1);
        
        // Check if all indices are valid
        if (idx00 < 0 || idx00 >= heightData.length ||
            idx10 < 0 || idx10 >= heightData.length ||
            idx01 < 0 || idx01 >= heightData.length ||
            idx11 < 0 || idx11 >= heightData.length) {
            return undefined;
        }
        
        // Get the heights at the four corners
        const h00 = heightData[idx00];
        const h10 = heightData[idx10];
        const h01 = heightData[idx01];
        const h11 = heightData[idx11];
        
        // Check for NaN or undefined values
        if (isNaN(h00) || isNaN(h10) || isNaN(h01) || isNaN(h11) ||
            h00 === undefined || h10 === undefined || h01 === undefined || h11 === undefined) {
            return undefined;
        }
        
        // Bilinear interpolation for smooth height
        const h0 = h00 * (1 - fracX) + h10 * fracX;
        const h1 = h01 * (1 - fracX) + h11 * fracX;
        const height = h0 * (1 - fracZ) + h1 * fracZ;
        
        return height;
    }
    
    isSteepSlope(localX, localZ, chunkSize, heightData, gridSize) {
        // Use passed gridSize or calculate it
        const gridSizeToUse = gridSize || Math.sqrt(heightData.length);
        
        // Get heights at nearby points using the improved height calculation
        const h1 = this.getHeightAt(localX, localZ, chunkSize, heightData, gridSizeToUse);
        
        // Check points in four directions at a small distance
        const checkDistance = 0.5; // Half a unit distance for slope check
        const h2 = this.getHeightAt(localX + checkDistance, localZ, chunkSize, heightData, gridSizeToUse);
        const h3 = this.getHeightAt(localX - checkDistance, localZ, chunkSize, heightData, gridSizeToUse);
        const h4 = this.getHeightAt(localX, localZ + checkDistance, chunkSize, heightData, gridSizeToUse);
        const h5 = this.getHeightAt(localX, localZ - checkDistance, chunkSize, heightData, gridSizeToUse);
        
        // If any height is invalid, consider it not a steep slope
        if (h1 === undefined || h2 === undefined || h3 === undefined || 
            h4 === undefined || h5 === undefined) {
            return false;
        }
        
        // Calculate maximum slope in any direction
        const maxSlope = Math.max(
            Math.abs(h1 - h2),
            Math.abs(h1 - h3),
            Math.abs(h1 - h4),
            Math.abs(h1 - h5)
        );
        
        // If height difference is too large, consider it a steep slope
        // The threshold is the maximum allowed height difference over the check distance
        const slopeThreshold = 1.0; // Reduced threshold for better placement
        return maxSlope > slopeThreshold;
    }
    
    // Helper method to visualize height points (for debugging)
    addHeightMarker(parent, x, y, z) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(x, y, z);
        parent.add(marker);
    }
    
    // Helper method to visualize all heights in a chunk (for debugging)
    addHeightMarkers(parent, heightData, gridSize, chunkSize) {
        const markerGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        
        // Add markers at a sparse interval to avoid too many objects
        const interval = Math.floor(gridSize / 8);
        
        for (let z = 0; z < gridSize; z += interval) {
            for (let x = 0; x < gridSize; x += interval) {
                const index = z * gridSize + x;
                if (index < heightData.length) {
                    const height = heightData[index];
                    
                    // Convert grid position to local coordinates
                    const localX = (x / (gridSize - 1)) * chunkSize;
                    const localZ = (z / (gridSize - 1)) * chunkSize;
                    
                    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                    marker.position.set(localX, height, localZ);
                    parent.add(marker);
                }
            }
        }
    }
    
    // Remove objects for a chunk
    removeObjectsForChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        if (this.objectsCache.has(chunkKey)) {
            const objects = this.objectsCache.get(chunkKey);
            this.scene.remove(objects);
            
            // Clean up geometries and materials
            objects.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            
            this.objectsCache.delete(chunkKey);
        }
    }
} 