# Wandering - 3D Procedural World Explorer

A beautiful 3D web application built with Three.js that lets you explore a procedurally generated world. The application features dynamic terrain generation, day/night cycles, and immersive first-person controls.

## Features

- Procedurally generated 3D terrain using simplex noise
- Dynamic chunk loading system for infinite exploration
- Realistic day/night cycle with sun, moon, and stars
- First-person controls for immersive exploration
- Beautiful sky with dynamic lighting and colors
- Water, mountains, forests, and more landscape features
- Optimized for performance with chunk-based rendering

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (v6 or higher)

### Installation

1. Clone this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Running the Application

Start the development server:

```bash
npm run dev
```

Then open your browser and go to `http://localhost:5173` to start exploring!

### Building for Production

Build optimized assets for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Controls

### Movement
- **W/A/S/D** or **Arrow Keys**: Move forward/left/backward/right
- **Spacebar**: Jump
- **Shift**: Run

### Camera
- **Arrow Keys**: Look around (up/down/left/right)
- **Trackpad**: Drag to look around
- **Click**: Engage pointer lock for smoother camera control

The game supports both mouse, trackpad, and keyboard-only controls, so you can play comfortably with your preferred input method.

## Technical Details

The application uses:

- Three.js for 3D rendering
- Simplex Noise for procedural generation
- Vite for fast development and builds

The world is generated in chunks, with new terrain being created as you explore. Only the chunks near the player are rendered to maintain performance. The terrain height is determined using multiple layers of simplex noise to create natural-looking landscapes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js team for their amazing 3D library
- simplex-noise for the procedural generation algorithms 