# Novation Twitch Controller Mapping for Mixxx

A complete, feature-rich controller mapping for the **Novation Twitch** DJ controller in **Mixxx 2.4+**, written entirely in vanilla JavaScript.

![Novation Twitch](https://github.com/mixxxdj/mixxx/wiki/media/hardware/novation_twitch.jpg)

## Overview

The Novation Twitch is a versatile 2-deck DJ controller with integrated audio interface, featuring touch strips, performance pads, crossfader, and a comprehensive FX section. This mapping provides deep integration with Mixxx, including advanced features and extensive shift functions.

## Key Features

This mapping provides a **complete rewrite** in vanilla JavaScript (no dependencies), offering significant improvements over the existing Mixco-based mapping:

- **Complete vanilla JavaScript implementation** - No framework dependencies, easier to maintain and extend
- **Advanced slicer mode** - Beat-synchronized slicing with visual LED feedback
- **FaderFX mode** - Creative filtering effects tied to crossfader position
- **Sampler mode** - Quick sampler triggering with double-tap looping
- **Touch strip flexibility** - Three modes: filter, swipe jog, and seek
- **Comprehensive shift functions** - Extended control over every button
- **Full LED feedback** - All button states reflected in hardware LEDs
- **Four performance pad modes**:
  - **Hot Cues** - 8 hot cue points (16 with shift bank toggle)
  - **Slicer** - Beat-synchronized loop slicing
  - **Auto Loop** - Quick loop sizes (1/8 to 32 beats)
  - **Loop Roll** - Temporary loop rolls
- **Master FX section** - Full control over Mixxx effect units
- **4-deck support** - Deck switching with A/C and B/D buttons
- **Library navigation** - Browse, load, and preview tracks

## Installation

### Requirements

- **Mixxx 2.4 or later** (tested with Mixxx 2.6 beta)
- **Novation Twitch** controller (firmware up to date)

### Manual Installation

1. Download or clone this repository
2. Copy the mapping files to your Mixxx controllers directory:

```bash
# Linux/Mac
cp novation_twitch/Novation_Twitch.js ~/.mixxx/controllers/
cp novation_twitch/Novation_Twitch.midi.xml ~/.mixxx/controllers/

# Windows
# Copy to: %LOCALAPPDATA%\Mixxx\controllers\
```

3. Launch Mixxx
4. Go to **Preferences > Controllers**
5. Select **Novation Twitch (Complete)** from the device list
6. Enable the controller

### Development Installation (Symlink Method)

For active development, symlink the files instead:

```bash
# Linux/Mac
ln -s /path/to/novation_twitch/novation_twitch/Novation_Twitch.js ~/.mixxx/controllers/
ln -s /path/to/novation_twitch/novation_twitch/Novation_Twitch.midi.xml ~/.mixxx/controllers/
```

This allows you to edit the files and reload the mapping in Mixxx without copying files.

## Usage

### Quick Start

1. **Load tracks**: Use the browse encoder and push to preview, or press LOAD A/B buttons
2. **Play/Pause**: Press PLAY button
3. **Sync**: Press SYNC button (hold SHIFT for sync leader)
4. **Hot Cues**: Press HOT CUES mode, then use the 8 performance pads
5. **Effects**: Use the Master FX section (DECK A/B buttons route effects)

### Performance Modes

Switch between modes using the mode buttons:

- **HOT CUES** - Access 8 hot cue points (shift toggles bank 1-8 ↔ 9-16)
- **SLICER** - Activates sampler mode (shift for beatjump forward)
- **AUTO LOOP** - Quick loop activation (shift for reloop toggle)
- **LOOP ROLL** - Temporary loop rolls (shift for beatjump backward)

### Touch Strip Modes

The touch strips have three modes (toggle with the mode button above each strip):

- **SWIPE** - Jog/scratch (shift for faster jog)
- **DROP** - Seek through track (shift for instant seek)
- **NONE** - Momentary filter (touch to apply, release to neutral)

### Shift Functions

Hold **SHIFT** to access extended functions on most buttons. See [MAPPING_REFERENCE.md](novation_twitch/MAPPING_REFERENCE.md) for complete details.

## Documentation

- **[MAPPING_REFERENCE.md](novation_twitch/MAPPING_REFERENCE.md)** - Complete control reference for all buttons and functions
- **[Mixxx Wiki - Novation Twitch](https://github.com/mixxxdj/mixxx/wiki/Novation%20Twitch)** - General controller information
- **PDFs** - Hardware manual, software reference, and programmer's guide included in `novation_twitch/` directory

## Comparison to Mixco Mapping

The existing Novation Twitch mapping in Mixxx uses the **Mixco framework**. This vanilla JavaScript rewrite offers:

| Feature | Mixco Version | This Mapping |
|---------|---------------|--------------|
| **Implementation** | CoffeeScript + Mixco framework | Pure vanilla JavaScript |
| **Slicer Mode** | Basic | Advanced with beat-sync LEDs |
| **FaderFX** | Limited | Full crossfader-tied filtering |
| **Sampler Mode** | Not available | Full sampler control |
| **Touch Strip** | Basic jog | Three modes (filter/swipe/seek) |
| **LED Feedback** | Partial | Comprehensive for all states |
| **Shift Functions** | Limited | Extensive on all buttons |
| **Maintainability** | Requires Mixco build | Direct JavaScript editing |

## Contributing

Contributions, bug reports, and feature requests are welcome!

### Reporting Issues

Please open an issue on GitHub with:
- Mixxx version
- Controller firmware version
- Steps to reproduce
- Expected vs actual behavior

### Testing Changes

After editing the JavaScript file:
1. Save your changes
2. In Mixxx, go to Preferences > Controllers
3. Click the controller and select "Load Preset"
4. Test your changes

For debugging:
```bash
mixxx --controllerDebug
```

## License

This project is licensed under the **GNU General Public License v3.0 or later** (GPL-3.0-or-later).

See [LICENSE](LICENSE) for the full license text.

## Credits

- **Author**: Sohail <sohail@gmail.com>
- **Mixxx Community**: For the excellent DJ software and controller framework
- **Novation**: For the hardware documentation

## Resources

- [Mixxx DJ Software](https://mixxx.org/)
- [Mixxx Manual - Controller Mapping](https://manual.mixxx.org/latest/chapters/controlling_mixxx.html)
- [Mixxx Forums](https://mixxx.discourse.group/)
- [Contributing Mappings to Mixxx](https://github.com/mixxxdj/mixxx/wiki/Contributing-Mappings)
