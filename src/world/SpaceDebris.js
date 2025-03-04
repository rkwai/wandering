import * as THREE from 'three';

export class SpaceDebris {
    constructor(scene) {
        this.scene = scene;
        
        // Create materials for different debris types
        this.materials = {
            asteroid: new THREE.MeshStandardMaterial({
                color: 0x777777,
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true
            }),
            
            metalDebris: new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                roughness: 0.4,
                metalness: 0.8,
                flatShading: true
            }),
            
            ice: new THREE.MeshStandardMaterial({
                color: 0xccf0ff,
                roughness: 0.2,
                metalness: 0.1,
                transparent: true,
                opacity: 0.8,
                flatShading: true
            })
        };
    }
    
    createDebris(type) {
        switch (type) {
            case 'asteroid':
                return this.createAsteroid();
            case 'metalDebris':
                return this.createMetalDebris();
            case 'ice':
                return this.createIceFragment();
            default:
                return this.createAsteroid();
        }
    }
    
    createAsteroid() {
        // Create a randomized rocky asteroid
        const detail = Math.floor(Math.random() * 2) + 1; // Level of geometric detail
        const geometry = new THREE.IcosahedronGeometry(1, detail);
        
        // Deform vertices for more natural look
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] += (Math.random() - 0.5) * 0.2;
            vertices[i+1] += (Math.random() - 0.5) * 0.2;
            vertices[i+2] += (Math.random() - 0.5) * 0.2;
        }
        
        // Update geometry
        geometry.computeVertexNormals();
        
        // Create mesh
        const asteroid = new THREE.Mesh(geometry, this.materials.asteroid);
        
        // Add collision properties
        asteroid.userData = {
            isDebris: true,
            debrisType: 'asteroid',
            collisionRadius: 1.0, // Base collision radius, will be scaled with the object
            mass: 10.0 // For physics calculations
        };
        
        // Shadow properties
        asteroid.castShadow = true;
        asteroid.receiveShadow = true;
        
        return asteroid;
    }
    
    createMetalDebris() {
        // Group to hold metal debris parts
        const debrisGroup = new THREE.Group();
        
        // Choose a random debris type
        const debrisType = Math.floor(Math.random() * 3);
        
        if (debrisType === 0) {
            // Create a broken satellite panel
            const panelGeometry = new THREE.BoxGeometry(1.5, 0.1, 1);
            const panel = new THREE.Mesh(panelGeometry, this.materials.metalDebris);
            
            // Add some deformation
            const vertices = panelGeometry.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                // Only deform corners
                if (Math.abs(vertices[i]) > 0.5 || Math.abs(vertices[i+2]) > 0.5) {
                    vertices[i] += (Math.random() - 0.5) * 0.2;
                    vertices[i+1] += (Math.random() - 0.5) * 0.2;
                    vertices[i+2] += (Math.random() - 0.5) * 0.2;
                }
            }
            
            panelGeometry.computeVertexNormals();
            debrisGroup.add(panel);
            
        } else if (debrisType === 1) {
            // Create a cylindrical tank or thruster
            const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
            const cylinder = new THREE.Mesh(cylinderGeometry, this.materials.metalDebris);
            debrisGroup.add(cylinder);
            
            // Add some dents
            const cap1Geometry = new THREE.CircleGeometry(0.3, 8);
            cap1Geometry.rotateX(Math.PI / 2);
            cap1Geometry.translate(0, 0.5, 0);
            const cap1 = new THREE.Mesh(cap1Geometry, this.materials.metalDebris);
            debrisGroup.add(cap1);
            
            const cap2Geometry = new THREE.CircleGeometry(0.3, 8);
            cap2Geometry.rotateX(-Math.PI / 2);
            cap2Geometry.translate(0, -0.5, 0);
            const cap2 = new THREE.Mesh(cap2Geometry, this.materials.metalDebris);
            debrisGroup.add(cap2);
            
        } else {
            // Create a piece of structural framework
            const barGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.5);
            
            // Create a cross-shaped frame
            const bar1 = new THREE.Mesh(barGeometry, this.materials.metalDebris);
            debrisGroup.add(bar1);
            
            const bar2 = new THREE.Mesh(barGeometry.clone(), this.materials.metalDebris);
            bar2.rotation.y = Math.PI / 2;
            debrisGroup.add(bar2);
            
            const bar3 = new THREE.Mesh(barGeometry.clone(), this.materials.metalDebris);
            bar3.rotation.x = Math.PI / 2;
            debrisGroup.add(bar3);
        }
        
        // Add collision properties
        debrisGroup.userData = {
            isDebris: true,
            debrisType: 'metalDebris',
            collisionRadius: 0.8,
            mass: 5.0
        };
        
        // Shadow properties
        debrisGroup.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        return debrisGroup;
    }
    
    createIceFragment() {
        // Create an ice fragment with crystalline structure
        let geometry;
        
        // Randomly choose between different crystal shapes
        const crystalType = Math.floor(Math.random() * 3);
        
        if (crystalType === 0) {
            geometry = new THREE.TetrahedronGeometry(1, 0);
        } else if (crystalType === 1) {
            geometry = new THREE.OctahedronGeometry(1, 0);
        } else {
            geometry = new THREE.DodecahedronGeometry(1, 0);
        }
        
        // Slightly deform for more natural look
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] += (Math.random() - 0.5) * 0.1;
            vertices[i+1] += (Math.random() - 0.5) * 0.1;
            vertices[i+2] += (Math.random() - 0.5) * 0.1;
        }
        
        // Update geometry
        geometry.computeVertexNormals();
        
        // Create mesh
        const ice = new THREE.Mesh(geometry, this.materials.ice);
        
        // Add collision properties
        ice.userData = {
            isDebris: true,
            debrisType: 'ice',
            collisionRadius: 0.9,
            mass: 3.0
        };
        
        // Shadow properties
        ice.castShadow = true;
        ice.receiveShadow = true;
        
        return ice;
    }
} 