import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.chunkSize = 32;
        this.renderDistance = 3;
        this.maxHeight = 40;
        this.noise2D = createNoise2D();
        this.lastPlayerChunk = { x: 0, z: 0 };
        
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
    }

    generateTerrain() {
        // Generate initial chunks around the origin
        this.generateInitialChunks();
        
        // Add water plane
        this.addWaterPlane();
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
        const chunkX = Math.floor(playerPosition.x / this.chunkSize);
        const chunkZ = Math.floor(playerPosition.z / this.chunkSize);
        
        // If player hasn't moved to a new chunk, do nothing
        if (chunkX === this.lastPlayerChunk.x && chunkZ === this.lastPlayerChunk.z) {
            return;
        }
        
        // Update last player chunk
        this.lastPlayerChunk = { x: chunkX, z: chunkZ };
        
        // Generate new chunks and remove distant ones
        for (let x = chunkX - this.renderDistance; x <= chunkX + this.renderDistance; x++) {
            for (let z = chunkZ - this.renderDistance; z <= chunkZ + this.renderDistance; z++) {
                const chunkKey = `${x},${z}`;
                
                // If chunk doesn't exist, generate it
                if (!this.chunks.has(chunkKey)) {
                    this.generateChunk(x, z);
                }
            }
        }
        
        // Remove chunks that are too far away
        this.chunks.forEach((chunk, key) => {
            const [x, z] = key.split(',').map(Number);
            
            if (Math.abs(x - chunkX) > this.renderDistance || 
                Math.abs(z - chunkZ) > this.renderDistance) {
                this.scene.remove(chunk);
                this.chunks.delete(key);
            }
        });
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
        geometry.rotateX(-Math.PI / 2); // Rotate to be horizontal
        
        // Get vertices and modify their height based on noise
        const vertices = geometry.attributes.position.array;
        const worldOffsetX = chunkX * this.chunkSize;
        const worldOffsetZ = chunkZ * this.chunkSize;
        
        // Material array for different terrain types
        const materials = [];
        
        // UV coordinates for texture mapping
        const uvs = [];
        
        // Apply height modifications to vertices
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + worldOffsetX;
            const z = vertices[i + 2] + worldOffsetZ;
            
            // Apply different layers of noise for more interesting terrain
            // Base terrain
            const baseNoise = this.noise2D(x * 0.01, z * 0.01) * 0.5 + 0.5;
            
            // Hills and mountains
            const mountainNoise = this.noise2D(x * 0.04, z * 0.04) * 0.5 + 0.5;
            
            // Small terrain details
            const detailNoise = this.noise2D(x * 0.1, z * 0.1) * 0.1;
            
            // Combine noise layers
            let height = baseNoise * this.maxHeight * 0.5;
            height += mountainNoise * mountainNoise * this.maxHeight * 0.5;
            height += detailNoise * this.maxHeight;
            
            // Set vertex height
            vertices[i + 1] = height;
            
            // Determine terrain type based on height and additional noise
            let material;
            if (height < 2) {
                material = this.materials.sand;
            } else if (height < 10) {
                material = this.materials.grass;
            } else if (height < 20) {
                material = this.materials.dirt;
            } else if (height < 35) {
                material = this.materials.stone;
            } else {
                material = this.materials.snow;
            }
            
            materials.push(material);
        }
        
        // Update the geometry
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Create mesh with the dominant material
        const dominantMaterial = this.getMostFrequentMaterial(materials);
        const mesh = new THREE.Mesh(geometry, dominantMaterial);
        
        // Enable shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add mesh to scene and store in chunks map
        this.scene.add(mesh);
        this.chunks.set(chunkKey, mesh);
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
        const waterGeometry = new THREE.PlaneGeometry(2000, 2000);
        waterGeometry.rotateX(-Math.PI / 2);
        
        const waterMesh = new THREE.Mesh(waterGeometry, this.materials.water);
        waterMesh.position.y = 1.5;
        waterMesh.receiveShadow = true;
        
        this.scene.add(waterMesh);
    }
} 