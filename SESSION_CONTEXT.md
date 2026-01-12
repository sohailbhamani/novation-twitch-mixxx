# Novation Twitch Mixxx Controller Mapping - Session Context

**Date:** 2026-01-09  
**Repository:** `/home/riz/dev/mixxx_novation_twitch/`  
**Mixxx Version:** 2.6 beta (for stems support)  
**Controller Files Location:** `/home/riz/.mixxx/controllers/`

## Files

- `Novation_Twitch.js` - Main JavaScript controller script
- `Novation_Twitch.midi.xml` - MIDI mapping XML
- `Novation_TWITCH_Manual_EN.pdf` - Hardware manual
- `Serato ITCH 2.2.2 User Manual.pdf` - Original software reference
- `twitch-programmers-reference2.pdf` - MIDI implementation reference

## Mixxx Reference

- **Wiki:** <https://github.com/mixxxdj/mixxx/wiki/>
- **Controls:** <https://manual.mixxx.org/latest/chapters/appendix/mixxx_controls.html>
- **Contributing Mappings:** <https://github.com/mixxxdj/mixxx/wiki/Contributing-Mappings>

---

## COMPLETED FEATURES

### Deck Buttons

| Button | Normal | SHIFT |
|--------|--------|-------|
| **PLAY** | play toggle | `reverseroll` (reverse while held) |
| **CUE** | cue_default | `cue_gotoandplay` |
| **SYNC** | sync_enabled toggle | `sync_leader` (set as leader) |
| **KEYLOCK** | keylock toggle | quantize toggle |
| **SET** | beats_translate_curpos | `bpmlock` toggle |
| **ADJUST** | beats_translate_match_alignment | slip_enabled toggle |
| **Load A/B** | Load deck 1/2 | Load deck 3/4 (**global shift** - any shift works) |
| **Deck Switch A/C** | Toggle Deck 1↔3 | **Clone from paired deck** (A clones C, C clones A) |
| **Deck Switch B/D** | Toggle Deck 2↔4 | **Clone from paired deck** (B clones D, D clones B) |

### Pitch Section

| Control | Normal | SHIFT |
|---------|--------|-------|
| **Pitch Encoder** | Rate adjust | Beatgrid translate earlier/later |
| **Pitch Encoder Push** | Cycle tempo range | Reset key |
| **FX Encoder** | QuickEffect super1 | beats_adjust_faster/slower |

### Touch Strip

| Mode | Normal | SHIFT |
|------|--------|-------|
| **SWIPE** | Slow/fine jog (10%) | Fast jog (100%) |
| **DROP** | Slow incremental seek (15% toward target) | Direct instant seek |
| **NONE** | Momentary filter (touch=position, swipe=adjust, release=neutral) | - |

### Performance Mode Buttons

| Button | Normal | SHIFT |
|--------|--------|-------|
| **Hot Cues** | Switch to hotcue mode | Toggle hotcue bank (1-8 ↔ 9-16) |
| **Slicer** | Switch to sampler mode | Beatjump forward |
| **AutoLoop** | Switch to autoloop mode | `reloop_toggle` |
| **LoopRoll** | Switch to looproll mode | Beatjump backward |

### Library Section

| Control | Normal | SHIFT |
|---------|--------|-------|
| **Browse Encoder** | 1:1 scroll | Page scroll (10 tracks) |
| **Browse Push** | Load to PreviewDeck + play | - |
| **AREA Button** | MoveFocus (sidebar↔tracklist) | - |
| **VIEW Button** | Toggle maximize_library | Toggle 4-deck view |

### Initialization

- Deck switch LEDs initialized OFF (decks 1+2 active)
- All deck pregains initialized to 1.0

---

## Master FX Section ✅ WORKING

| Control | Function |
|---------|----------|
| **DEPTH Pot** | Target unit mix (wet/dry) |
| **MOD Encoder** | Target unit super1 (controls all linked effect params) |
| **MOD Push** | next_chain_preset |
| **BEATS Encoder** | Meta knob of focused effect slot (1-3) |
| **BEATS Push** | Cycle focused slot (1→2→3→1) |
| **FX SELECT ←/→** | Prev/next effect for focused slot |
| **DECK A** | Target Unit 1 / SHIFT: Unit 3 |
| **DECK B** | Target Unit 2 / SHIFT: Unit 4 |
| **ON/OFF** | Toggle all 3 effect slots enabled |

---

## Korg nanoKONTROL Custom Mapping

**Files:** `korg_nanokontrol/` subfolder

### Hardware Configuration

Run `configure_scenes.py` to program the controller:

- Scenes 1-4 set to MIDI Channels 1-4
- Button A (top row): **Toggle mode** (LED latches on/off)
- Button B (bottom row): **Momentary mode**

### Scene Layout

| Scene | MIDI Ch | Purpose |
|-------|---------|---------|
| 1 | Ch 1 | Stock 2-deck mixer |
| 2 | Ch 2 | Stems: Deck A + B |
| 3 | Ch 3 | Stems: Deck C + D |
| 4 | Ch 4 | 8 Samplers |

### Scene 4: Samplers

| Control | Function |
|---------|----------|
| Knob | Rate (±0.5 range) |
| Slider | Volume |
| Button A | Play (cue_gotoandplay) |
| Button B | Stop |
| Transport STOP | Stop all samplers |
| Transport REW | Eject all samplers |

### Notes

- LED feedback removed (caused lag issues)
- Samplers auto-sync in LateNight skin
- Requires Mixxx 2.6 beta for stems (Scenes 2-3)

---

## KEY IMPLEMENTATION PATTERNS

### Global Shift Check (for Library controls)

```javascript
var shifted = (NovationTwitch.deck1 && NovationTwitch.deck1.shifted) ||
              (NovationTwitch.deck2 && NovationTwitch.deck2.shifted);
```

### Per-Deck Shift (for deck-specific controls)

```javascript
if (thisDeck.shifted) { ... }
```

### Effect Unit Controls

```javascript
// Wet/dry mix
engine.setValue('[EffectRack1_EffectUnit1]', 'mix', value/127);
// Effect parameter
engine.setValue('[EffectRack1_EffectUnit1_Effect1]', 'meta', value);
// Route to channel
engine.setValue('[EffectRack1_EffectUnit1]', 'group_[Channel1]_enable', 1/0);
// Cycle effects
engine.setValue('[EffectRack1_EffectUnit1_Effect1]', 'next_effect', 1);
```

### Mixxx Control Names (2.5)

- `bpmlock` (not bpm_lock) - beatgrid lock
- `[Skin], show_4decks` - 4-deck view
- `[Skin], show_maximized_library` - library maximize
- `CloneFromDeck` - clone track (takes deck number 1-4)

---

## KNOWN ISSUES

- Fader FX ON/OFF button is hardware mode switch, not mappable
- No "undo beatgrid" control exists in Mixxx
- Library size cycling not available (only maximize toggle)
- VuMeter controls deprecated: use `[Main]` instead of `[Master]`

---

## TESTING COMMANDS

```bash
# Launch with debug
mixxx --controllerDebug

# Copy files to controllers folder
cp Novation_Twitch.js Novation_Twitch.midi.xml ~/.mixxx/controllers/
```
