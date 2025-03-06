# Audio Assets

This directory contains all audio assets for the side-scroller game.

## Directory Structure

- `/music`: Background music tracks and themes
- `/sfx`: Sound effects organized by type
- `/ambient`: Ambient and environmental sounds

## Audio Format Guidelines

- **Music**:
  - Format: MP3 (128-192kbps) or OGG Vorbis
  - Sample Rate: 44.1kHz
  - Channels: Stereo
  - Loop Points: Include metadata for seamless looping
  
- **Sound Effects**:
  - Format: MP3 (128kbps) or WebM
  - Sample Rate: 44.1kHz
  - Channels: Mono for positional audio, Stereo for UI/global sounds
  - Duration: Keep as short as possible while maintaining quality
  
- **Ambient**:
  - Format: MP3 or OGG Vorbis
  - Sample Rate: 44.1kHz
  - Channels: Stereo or Mono depending on positional needs
  - Looping: Design for seamless looping

## Naming Conventions

- Use descriptive, lowercase names with hyphens
- Follow the pattern: `category-action-variant.extension`
- Examples:
  - `sfx-jump-01.mp3`
  - `music-level1-main.mp3`
  - `ambient-forest-day.mp3`

## Music Guidelines

- Main themes: 1-3 minutes before looping
- Design intro and loop sections
- Create variations for different gameplay states (normal, tension, victory)
- Consider dynamic music layering for gameplay progression
- Normalize to -14 LUFS integrated loudness

## Sound Effect Guidelines

- Create variations for frequently used sounds (at least 2-3 variants)
- Group related sounds into categories
- Normalize to -12 LUFS short-term loudness
- Keep effects concise and impactful
- Critical gameplay sounds should be distinctive

## Implementation Considerations

- Preload essential audio before gameplay begins
- Load music streams progressively
- Consider memory usage on mobile devices
- Implement dynamic mixing based on game state
- Create categorized volume controls (Music, SFX, Ambient)
- Design with accessibility in mind (critical gameplay cues should have visual equivalents)

## Audio Design Philosophy

- Audio should enhance gameplay without being distracting
- Sound effects should provide clear feedback for player actions
- Music should match the emotional tone of the level/area
- Ambient audio should create a sense of environment and space
- Use audio cues to telegraph enemy actions or level events 