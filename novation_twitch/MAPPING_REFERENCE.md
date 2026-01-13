# Novation Twitch - Complete Mapping Reference

*Generated from actual source files: Novation_Twitch.js and Novation_Twitch.midi.xml*

---

## DECK A/C (Left) - MIDI Channel 8

| Control | Normal | SHIFT |
|---------|--------|-------|
| **PLAY** | play | reverseroll |
| **CUE** | cue_default | cue_gotoandplay |
| **SYNC** | sync_enabled | sync_leader |
| **KEYLOCK** | keylock | quantize |
| **SET** | beats_translate_curpos | bpmlock |
| **ADJUST** | beats_translate_match_alignment | slip_enabled |
| **PFL** | pfl toggle | - |
| **DECK SWITCH** | Toggle Deck A ↔ C | Clone from paired deck |
| **SHIFT** | Hold for shift functions | - |

### Encoders

| Encoder | Turn | Push | SHIFT+Turn | SHIFT+Push |
|---------|------|------|------------|------------|
| **PITCH** | Rate (tempo) | Cycle through rate ranges | Key adjust | Reset key |
| **FX (Filter)** | QuickEffect super1 | Sync key to track | Beatgrid adjust | Reset key |

### Knobs

| Knob | Function |
|------|----------|
| **TRIM** | Deck gain |
| **EQ HIGH** | EQ High |
| **EQ MID** | EQ Mid |
| **EQ LOW** | EQ Low |
| **VOLUME** | Deck volume fader |

### Touch Strip

| Mode | Normal | SHIFT |
|------|--------|-------|
| **None (default)** | Filter sweep | - |
| **SWIPE** | Jog/scratch | Faster jog |
| **DROP** | Incremental seek | Instant seek to position |

### Performance Mode Buttons

| Button | Normal | SHIFT |
|--------|--------|-------|
| **HOT CUES** | Switch to Hot Cue mode | Toggle hotcue banks 1-8 ↔ 9-16 |
| **SLICER** | Switch to Slicer mode | beatjump_1_forward |
| **AUTOLOOP** | Switch to AutoLoop mode | reloop_toggle |
| **LOOP ROLL** | Switch to Loop Roll mode | beatjump_1_backward |

### Performance Pads (depends on mode)

**Hot Cue Mode:** Pads 1-8 = hotcue_1 through hotcue_8  
**Slicer Mode:** Pads 1-8 = beatloop_X_toggle (1/8, 1/4, 1/2, 1, 2, 4, 8, 16 beats)  
**AutoLoop Mode:** Pads 1-8 = beatloop_X_toggle  
**Loop Roll Mode:** Pads 1-8 = beatlooproll_X_activate

---

## DECK B/D (Right) - MIDI Channel 9

**Same as Deck A/C but for right side deck.**

---

## MASTER FX SECTION

Controls Effect Unit 1-4 depending on DECK A/B selection.

| Control | Function |
|---------|----------|
| **DEPTH pot** | Effect Unit wet/dry mix |
| **MOD encoder turn** | SuperKnob (all linked effect params) |
| **MOD encoder push** | Next effect chain preset |
| **BEATS encoder turn** | Meta knob of focused effect slot |
| **BEATS encoder push** | Cycle focus: Slot 1 → 2 → 3 → 1 |
| **AUX button** | Toggle effect routing to Auxiliary |
| **DECK A button** | Switch to control Effect Unit 1 |
| **SHIFT + DECK A** | Switch to control Effect Unit 3 |
| **DECK B button** | Switch to control Effect Unit 2 |
| **SHIFT + DECK B** | Switch to control Effect Unit 4 |
| **FX SELECT ←** | Previous effect for focused slot |
| **FX SELECT →** | Next effect for focused slot |
| **ON/OFF** | Toggle all 3 effect slots enabled |

---

## BROWSE SECTION

| Control | Function |
|---------|----------|
| **Browse Encoder turn** | Scroll library list |
| **Browse Encoder push** | Load to PreviewDeck + play |
| **AREA button** | MoveFocus (switch library panels) |
| **VIEW button** | Toggle show_maximized_library |
| **SHIFT + VIEW** | Toggle show_4decks |
| **BACK button** | MoveLeft (collapse/back) |
| **FWD button** | MoveRight (expand/forward) |
| **LOAD A** | Load selected track to Deck A (SHIFT: Deck C) |
| **LOAD B** | Load selected track to Deck B (SHIFT: Deck D) |

---

## MIC / AUX SECTION

| Control | Function |
|---------|----------|
| **AUX LEVEL pot** | Auxiliary1 volume |
| **AUX button** | Auxiliary1 pfl toggle |
| **AUX ON/OFF** | (mapped to Note 0x0C) |

---

## CROSSFADER

| Control | Function |
|---------|----------|
| **Crossfader** | Master crossfader |

---

## UNMAPPED HARDWARE CONTROLS

These are audio-only and don't send MIDI:

- Master volume knob
- Booth volume knob  
- Headphone volume knob
- Headphone cue/mix knob

The **Fader FX ON/OFF button** is a hardware mode switch (not MIDI).

---

## CONTROLS WITH NO SHIFT FUNCTION

| Control | Why |
|---------|-----|
| PFL | Could add slip_enabled or quantize |
| Browse Push | Could add load without play |
| AREA | Could add maximize sidebar |
| MOD Push | - |
| BEATS Push | - |
| AUX (FX section) | - |
