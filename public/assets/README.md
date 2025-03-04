# 3D Assets for Cosmic Wanderer

This directory contains the 3D models and assets used in the Cosmic Wanderer space simulator.

## Adding GLB Models

You can add GLB files to the appropriate folders based on their type:

- `models/spaceships/` - For player ships and NPC vessels
- `models/asteroids/` - For asteroid and space debris models
- `models/environment/` - For environmental elements like stations, planets, etc.

## Usage Guidelines

1. **File naming**: Use descriptive names with lowercase and hyphens (e.g., `fighter-ship.glb`, `large-asteroid.glb`)
2. **Optimization**: Keep file sizes reasonable (preferably under 5MB per model)
3. **Scaling**: Models should use consistent scaling where possible
4. **Origins**: Center the model origins appropriately for proper rotation and movement

## Loading Models in Code

Models can be loaded in the application using the Three.js GLTFLoader:

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load(
  '/assets/models/spaceships/your-model.glb',
  (gltf) => {
    // Model loaded successfully
    const model = gltf.scene;
    scene.add(model);
  },
  (xhr) => {
    // Loading progress
    console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
  },
  (error) => {
    // Error handling
    console.error('An error happened:', error);
  }
);
``` 