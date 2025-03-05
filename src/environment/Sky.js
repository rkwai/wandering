import * as THREE from 'three';

export class Sky {
    constructor(scene) {
        this.scene = scene;
        // We're not creating a sky anymore as we're only using planet GLB for background
    }
    
    update(delta) {
        // No sky to update
    }
} 