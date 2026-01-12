# Korg nanoKONTROL Custom Mapping

Custom 4-scene mapping for Mixxx.

## Scenes

| Scene | MIDI Ch | Purpose |
|-------|---------|---------|
| 1 | Ch 1 | Stock 2-deck mixer |
| 2 | Ch 2 | Stems: Deck A + B |
| 3 | Ch 3 | Stems: Deck C + D |
| 4 | Ch 4 | 8 Samplers |

## Requirements

- **Mixxx 2.5** for Scene 1 (stock) and Scene 4 (samplers)
- **Mixxx 2.6 beta** for Scenes 2-3 (stems)

## Setup

1. Run `configure_scenes.py` to program the controller hardware
2. Copy `.js` and `.midi.xml` to `~/.mixxx/controllers/`
3. Restart Mixxx and select "Korg nanoKONTROL (Custom 4-Scene)"

## Hardware Configuration

The `configure_scenes.py` script programs:

- Scenes 1-4 → MIDI Channels 1-4
- Button A (top row): **Toggle mode** (LED latches)
- Button B (bottom row): **Momentary mode**

## Scene 4: Samplers

| Control | Function |
|---------|----------|
| Knob | Rate (±0.5 range) |
| Slider | Volume |
| Button A | Play (restart from cue) |
| Button B | Stop |
| Transport STOP | Stop all samplers |
| Transport REW | Eject all samplers |

## Notes

- LED feedback was removed from the JS mapping (caused performance issues)
- Button A toggle mode allows LEDs to stay lit when pressed
- LateNight skin auto-syncs samplers
