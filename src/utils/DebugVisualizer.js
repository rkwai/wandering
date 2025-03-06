/**
 * Utility class for visualizing collision shapes for debugging
 */
import * as THREE from 'three';
import debugHelper from './DebugHelper.js';

export class DebugVisualizer {
    constructor(scene) {
        this.scene = scene;
        this.helpers = new Map(); // Map of all visualization helpers
        this.enabled = false; // Disabled by default
        this.colors = {
            box: 0x00ff00, // Green for boxes
            sphere: 0xff0000, // Red for spheres
            asteroid: 0xff6600, // Orange for asteroids
            player: 0x00ffff, // Cyan for player
            missile: 0xffff00, // Yellow for missiles
            default: 0xffffff // White default
        };
        debugHelper.log("DebugVisualizer: Initialized (disabled by default)");
    }
    
    /**
     * Visualize a bounding box
     * @param {THREE.Box3} box - The bounding box to visualize
     * @param {string} id - Unique identifier
     * @param {string} type - Object type for color
     */
    visualizeBox(box, id, type = 'default') {
        if (!this.enabled || !box) return;
        
        // Create a unique ID if not provided
        const objectId = `box_${id || Math.random().toString(36).substring(2, 10)}`;
        
        // Remove any existing visualization
        this.removeHelper(objectId);
        
        // Get color for this type
        const color = this.colors[type] || this.colors.default;
        
        // Create a wireframe box
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const edges = new THREE.EdgesGeometry(boxGeometry);
        boxGeometry.dispose(); // Dispose intermediate geometry
        
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 3, // Thicker lines for better visibility
            transparent: true,
            opacity: 0.8, // Slightly more opaque
            depthTest: false // Show through other objects
        });
        
        const boxHelper = new THREE.LineSegments(edges, material);
        
        // Position at center of box
        const center = new THREE.Vector3();
        box.getCenter(center);
        boxHelper.position.copy(center);
        
        // Add to scene and store
        this.scene.add(boxHelper);
        this.helpers.set(objectId, {
            type: 'box',
            helper: boxHelper,
            object: box
        });
        
        debugHelper.log(`DebugVisualizer: Created box visualization for ${id}`);
    }
    
    /**
     * Visualize a bounding sphere
     * @param {THREE.Sphere} sphere - The sphere to visualize
     * @param {string} id - Unique identifier
     * @param {string} type - Object type for color
     */
    visualizeSphere(sphere, id, type = 'default') {
        if (!this.enabled || !sphere) return;
        
        // Create a unique ID if not provided
        const objectId = `sphere_${id || Math.random().toString(36).substring(2, 10)}`;
        
        // Remove any existing visualization
        this.removeHelper(objectId);
        
        // Get color for this type
        const color = this.colors[type] || this.colors.default;
        
        // Create a more visible sphere (higher segment count for smoother appearance)
        const sphereGeometry = new THREE.SphereGeometry(sphere.radius, 24, 16);
        const wireframe = new THREE.WireframeGeometry(sphereGeometry);
        sphereGeometry.dispose(); // Dispose intermediate geometry
        
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 2,
            transparent: true,
            opacity: 0.8, // More opaque for visibility
            depthTest: false // Show through other objects
        });
        
        const sphereHelper = new THREE.LineSegments(wireframe, material);
        
        // Position at center of sphere
        sphereHelper.position.copy(sphere.center);
        
        // Add to scene and store
        this.scene.add(sphereHelper);
        this.helpers.set(objectId, {
            type: 'sphere',
            helper: sphereHelper,
            object: sphere
        });
        
        debugHelper.log(`DebugVisualizer: Created sphere visualization for ${id}`);
    }
    
    /**
     * Visualize both a bounding box and sphere for an object
     * @param {Object} object - Object with boundingBox and boundingSphere
     * @param {string} id - Unique identifier
     * @param {string} type - Object type for color
     */
    visualizeColliders(object, id, type = 'default') {
        if (!this.enabled) return;
        
        if (object.boundingBox) {
            this.visualizeBox(object.boundingBox, `${id}_box`, type);
        }
        
        if (object.boundingSphere) {
            this.visualizeSphere(object.boundingSphere, `${id}_sphere`, type);
        }
    }
    
    /**
     * Remove a helper by ID
     * @param {string} id - Helper ID to remove
     */
    removeHelper(id) {
        if (this.helpers.has(id)) {
            const helper = this.helpers.get(id);
            this.scene.remove(helper.helper);
            
            if (helper.helper.geometry) helper.helper.geometry.dispose();
            if (helper.helper.material) helper.helper.material.dispose();
            
            this.helpers.delete(id);
        }
    }
    
    /**
     * Remove all visualizations for an object ID
     * @param {string} objectId - Base object ID
     */
    removeVisualization(objectId) {
        this.removeHelper(`box_${objectId}`);
        this.removeHelper(`sphere_${objectId}`);
        this.removeHelper(`box_${objectId}_box`);
        this.removeHelper(`sphere_${objectId}_sphere`);
        this.removeHelper(`center_${objectId}`);
    }
    
    /**
     * Clear all visualizations
     */
    clearAll() {
        for (const [id, helper] of this.helpers.entries()) {
            this.scene.remove(helper.helper);
            
            if (helper.helper.geometry) helper.helper.geometry.dispose();
            if (helper.helper.material) helper.helper.material.dispose();
        }
        
        this.helpers.clear();
        debugHelper.log("DebugVisualizer: Cleared all visualizations");
    }
    
    /**
     * Toggle visualization on/off
     * @param {boolean} [enabled] - Set enabled state or toggle if not provided
     */
    toggle(enabled) {
        this.enabled = enabled !== undefined ? enabled : !this.enabled;
        
        for (const helper of this.helpers.values()) {
            helper.helper.visible = this.enabled;
        }
        
        debugHelper.log(`DebugVisualizer: ${this.enabled ? 'Enabled' : 'Disabled'}`);
    }
    
    /**
     * Special visualization for asteroids with highlighted colliders
     * @param {Object} asteroid - The asteroid object
     */
    visualizeAsteroid(asteroid) {
        if (!this.enabled || !asteroid || !asteroid.id) return;
        
        // Remove any existing visualizations for this asteroid
        this.removeVisualization(asteroid.id);
        
        // Visualize bounding box with extra bright color
        if (asteroid.boundingBox) {
            const boxGeometry = new THREE.BoxGeometry(
                asteroid.boundingBox.max.x - asteroid.boundingBox.min.x,
                asteroid.boundingBox.max.y - asteroid.boundingBox.min.y,
                asteroid.boundingBox.max.z - asteroid.boundingBox.min.z
            );
            
            const edges = new THREE.EdgesGeometry(boxGeometry);
            boxGeometry.dispose();
            
            const boxMaterial = new THREE.LineBasicMaterial({
                color: 0xff3300, // Bright orange-red
                linewidth: 3,
                transparent: true,
                opacity: 0.9,
                depthTest: false
            });
            
            const boxHelper = new THREE.LineSegments(edges, boxMaterial);
            
            // Position at center of box
            const center = new THREE.Vector3();
            asteroid.boundingBox.getCenter(center);
            boxHelper.position.copy(center);
            
            // Add to scene and store
            this.scene.add(boxHelper);
            this.helpers.set(`box_${asteroid.id}`, {
                type: 'box',
                helper: boxHelper,
                object: asteroid.boundingBox
            });
        }
        
        // Visualize bounding sphere with extra bright color
        if (asteroid.boundingSphere) {
            // Use a different color for the visual sphere to make it stand out
            const sphereGeometry = new THREE.SphereGeometry(
                asteroid.boundingSphere.radius,
                24, 18
            );
            
            const wireframe = new THREE.WireframeGeometry(sphereGeometry);
            sphereGeometry.dispose();
            
            const sphereMaterial = new THREE.LineBasicMaterial({
                color: 0xff0000, // Bright red
                linewidth: 2,
                transparent: true,
                opacity: 0.9,
                depthTest: false
            });
            
            const sphereHelper = new THREE.LineSegments(wireframe, sphereMaterial);
            
            // Position at center of sphere
            sphereHelper.position.copy(asteroid.boundingSphere.center);
            
            // Add to scene and store
            this.scene.add(sphereHelper);
            this.helpers.set(`sphere_${asteroid.id}`, {
                type: 'sphere',
                helper: sphereHelper,
                object: asteroid.boundingSphere
            });
            
            // Also add a point at the center for extra clarity
            const centerGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const centerMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff, // White
                transparent: false,
                depthTest: false
            });
            const centerPoint = new THREE.Mesh(centerGeometry, centerMaterial);
            centerPoint.position.copy(asteroid.boundingSphere.center);
            this.scene.add(centerPoint);
            this.helpers.set(`center_${asteroid.id}`, {
                type: 'center',
                helper: centerPoint,
                object: asteroid.boundingSphere
            });
        }
        
        debugHelper.log(`DebugVisualizer: Created enhanced visualization for asteroid ${asteroid.id}`);
    }
}

// Singleton instance
const debugVisualizer = {
    instance: null,
    
    /**
     * Initialize with a scene
     * @param {THREE.Scene} scene - The scene to add visualizations to
     */
    init(scene) {
        if (!this.instance) {
            this.instance = new DebugVisualizer(scene);
        }
        return this.instance;
    },
    
    /**
     * Get singleton instance
     */
    getInstance() {
        if (!this.instance) {
            console.warn("DebugVisualizer not initialized. Call init() first.");
            return null;
        }
        return this.instance;
    }
};

export default debugVisualizer; 