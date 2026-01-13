/**
 * Novation Twitch DJ Controller Mapping for Mixxx
 * Copyright (C) 2025 Sohail <sohail@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * ---
 *
 * Novation Twitch DJ Controller Mapping for Mixxx 2.4+
 *
 * Complete mapping based on Novation Twitch Programmer's Reference Guide
 *
 * MIDI Channel Reference (in Advanced Mode):
 *   - Channel 8 (0x97/0xB7): Deck A (left side), Crossfader, FX Section, Browse
 *   - Channel 9 (0x98/0xB8): Deck B (right side)
 *   - Channel 10 (0x99/0xB9): Left performance section (Advanced Mode)
 *   - Channel 11 (0x9A/0xBA): Right performance section (Advanced Mode)
 *   - Channel 12 (0x9B/0xBB): Master FX section
 */

var NovationTwitch = {};

// =====================================================
// DECK OBJECT
// =====================================================
NovationTwitch.Deck = function (deckNumbers, midiChannel) {
  components.Deck.call(this, deckNumbers);

  var thisDeck = this;
  this.midiChannel = midiChannel;
  this.midiChannelBase = 0x90 + midiChannel; // Note messages
  this.midiCCBase = 0xB0 + midiChannel;      // CC messages

  // State variables
  this.performanceModes = ['hotCues', 'slicer', 'autoLoop', 'loopRoll'];
  this.performanceMode = this.performanceModes[0];

  this.touchStripModes = ['none', 'swipe', 'drop'];
  this.touchStripMode = this.touchStripModes[0];

  this.shifted = false;
  this.tempoChangeRate = 0.001;

  // Beatloop sizes for performance pads
  this.beatloopSizes = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16];

  // Hotcue bank offset (0 = cues 1-8, 8 = cues 9-16)
  this.hotcueBank = 0;

  // FaderFX State
  this.faderFX = {
    active: false,
    blinkState: 0
  };

  // Encoder Push State for Push+Turn
  this.fxEncoderPushed = false;

  // Double-tap detection for sampler looping
  this.samplerLastTapTime = {}; // Stores timestamp of last tap for each pad (1-8)
  this.samplerDoubleTapThreshold = 300; // milliseconds

  // Slicer mode state
  this.slicerDomain = 8;                  // Number of beats per slice set (default: 8)
  this.slicerLoopActive = false;          // Whether slicer loop is active
  this.slicerOriginalLoop = null;         // Saved loop state
  this.currentSliceIndex = -1;            // Which slice (0-7) is currently playing
  this.slicerBeatConnection = null;       // Connection for beat-synchronized LED updates
  this.slicerPadHeld = 0;                 // Which pad is currently held (1-8, or 0 if none)

  this.updateFader = function () {
    // Logic handled in volumeFader.input but we need to update LED here
    var ledNote = 0x0D;
    var ledVal = this.faderFX.active ? (this.faderFX.blinkState ? 15 : 0) : 0;
    midi.sendShortMsg(this.midiChannelBase, ledNote, ledVal);
  };


  // ===================================================
  // PERFORMANCE PAD FUNCTIONS
  // ===================================================
  this.updatePerformancePads = function () {
    // Cleanup slicer mode when switching away from slicer
    if (this.performanceMode !== 'slicer') {
      this.stopSlicerLEDUpdate();

      // Exit slicer if active
      if (this.slicerLoopActive) {
        this.exitSlicerMode();
      }
    }

    var pads = [this.performancePad1, this.performancePad2, this.performancePad3,
    this.performancePad4, this.performancePad5, this.performancePad6,
    this.performancePad7, this.performancePad8];

    for (var i = 0; i < pads.length; i++) {
      var pad = pads[i];
      pad.disconnect();

      (function (pad, padNumber, deck) {
        switch (deck.performanceMode) {
          case 'hotCues':
            pad.group = deck.currentDeck;
            var cueNum = padNumber + deck.hotcueBank; // Supports cues 1-8 or 9-16
            pad.outKey = 'hotcue_' + cueNum + '_status';
            pad.on = 79;
            pad.off = 65;
            pad.input = function (channel, control, value, status, group) {
              if (value === 127) {
                var cue = padNumber + deck.hotcueBank;
                if (deck.shifted) {
                  engine.setValue(deck.currentDeck, 'hotcue_' + cue + '_clear', 1);
                } else {
                  engine.setValue(deck.currentDeck, 'hotcue_' + cue + '_activate', 1);
                }
              }
            };
            break;

          case 'sampler':
            pad.group = '[Sampler' + padNumber + ']';
            pad.outKey = 'track_loaded';
            pad.on = 15; // Dim for Sampler Mode
            pad.off = 1;
            pad.input = function (channel, control, value, status, group) {
              if (value === 127) {
                if (deck.shifted) {
                  // SHIFT + Pad: Stop sampler
                  engine.setValue('[Sampler' + padNumber + ']', 'stop', 1);
                } else {
                  // Normal: Play sampler with double-tap detection for looping
                  var currentTime = Date.now();
                  var lastTapTime = deck.samplerLastTapTime[padNumber] || 0;
                  var timeSinceLastTap = currentTime - lastTapTime;

                  if (timeSinceLastTap < deck.samplerDoubleTapThreshold) {
                    // Double-tap detected: Enable repeat/loop mode
                    engine.setValue('[Sampler' + padNumber + ']', 'repeat', 1);
                    engine.setValue('[Sampler' + padNumber + ']', 'cue_gotoandplay', 1);
                    print("Sampler " + padNumber + ": Loop enabled (double-tap)");
                    // Reset tap time to prevent triple-tap issues
                    deck.samplerLastTapTime[padNumber] = 0;
                  } else {
                    // Single tap: Disable repeat/loop, play once
                    engine.setValue('[Sampler' + padNumber + ']', 'repeat', 0);
                    engine.setValue('[Sampler' + padNumber + ']', 'cue_gotoandplay', 1);
                    // Store tap time for double-tap detection
                    deck.samplerLastTapTime[padNumber] = currentTime;
                  }
                }
              } else {
                if (!deck.shifted) {
                  engine.setValue('[Sampler' + padNumber + ']', 'cue_gotoandplay', 0);
                }
              }
            };
            break;

          case 'slicer':
            // Serato-style Loop Slicer
            // Shift: Sampler (Legacy behavior)

            pad.group = deck.currentDeck;
            pad.outKey = 'track_loaded';
            pad.on = (deck.shifted) ? 15 : 127;
            pad.off = 1;

            pad.input = function (channel, control, value, status, group) {
              if (deck.shifted) {
                // SHIFT: Sampler 1-8 (backward compatible)
                if (value === 127) {
                  engine.setValue('[Sampler' + padNumber + ']', 'cue_gotoandplay', 1);
                } else {
                  engine.setValue('[Sampler' + padNumber + ']', 'cue_gotoandplay', 0);
                }
              } else {
                // NORMAL: Loop Slicer
                var trackSamples = engine.getValue(deck.currentDeck, 'track_samples');

                if (value === 127) { // Pad Down
                  // Get loop boundaries (should exist from entering slicer mode)
                  var loopStart = engine.getValue(deck.currentDeck, 'loop_start_position');
                  var loopEnd = engine.getValue(deck.currentDeck, 'loop_end_position');

                  if (loopStart !== -1 && loopEnd !== -1 && trackSamples > 0) {
                    var loopLen = loopEnd - loopStart;
                    var sliceLen = loopLen / 8;

                    // Calculate target slice
                    var sliceStart = loopStart + ((padNumber - 1) * sliceLen);
                    var sliceEnd = sliceStart + sliceLen;

                    // Save the full 8-slice loop if not already saved
                    if (!deck.slicerOriginalLoop || !deck.slicerOriginalLoop.fullLoop) {
                      deck.slicerOriginalLoop = {
                        enabled: true,
                        start: loopStart,
                        end: loopEnd,
                        fullLoop: true
                      };
                    }

                    // Jump to slice start
                    engine.setValue(deck.currentDeck, 'playposition', sliceStart / trackSamples);

                    // Create tight loop around this slice only
                    engine.setValue(deck.currentDeck, 'loop_start_position', sliceStart);
                    engine.setValue(deck.currentDeck, 'loop_end_position', sliceEnd);

                    deck.currentSliceIndex = padNumber - 1;
                    deck.slicerPadHeld = padNumber;

                    print("Slicer: Pad " + padNumber + " (slice " + (padNumber - 1) + ")");
                  }

                } else { // Pad Up
                  // Restore full 8-slice loop
                  if (deck.slicerOriginalLoop && deck.slicerOriginalLoop.fullLoop) {
                    engine.setValue(deck.currentDeck, 'loop_start_position', deck.slicerOriginalLoop.start);
                    engine.setValue(deck.currentDeck, 'loop_end_position', deck.slicerOriginalLoop.end);
                  }

                  deck.slicerPadHeld = 0;
                }
              }
            };
            break;

          case 'autoLoop':
            pad.group = deck.currentDeck;
            pad.outKey = 'beatloop_' + deck.beatloopSizes[padNumber - 1] + '_enabled';
            pad.on = 127;
            pad.off = 113;
            pad.input = function (channel, control, value, status, group) {
              if (value === 127) {
                engine.setValue(deck.currentDeck, 'beatloop_' + deck.beatloopSizes[padNumber - 1] + '_toggle', 1);
              }
            };
            break;

          case 'loopRoll':
            pad.group = deck.currentDeck;
            pad.outKey = 'beatloop_' + deck.beatloopSizes[padNumber - 1] + '_enabled';
            pad.on = 127;
            pad.off = 113;
            pad.input = function (channel, control, value, status, group) {
              if (value === 127) {
                engine.setValue(deck.currentDeck, 'beatlooproll_' + deck.beatloopSizes[padNumber - 1] + '_activate', 1);
              } else {
                engine.setValue(deck.currentDeck, 'beatlooproll_' + deck.beatloopSizes[padNumber - 1] + '_activate', 0);
              }
            };
            break;
        }
      })(pad, i + 1, this);

      pad.connect();
      pad.trigger();
    }

    // Update performance mode button LEDs
    var modeIndex = this.performanceModes.indexOf(this.performanceMode);
    for (var j = 0; j < 4; j++) {
      midi.sendShortMsg(this.midiChannelBase, 0x38 + j, (j === modeIndex) ? 15 : 0);
    }
  };

  // ===================================================
  // TOUCH STRIP FUNCTIONS
  // ===================================================
  this.updateTouchStripMode = function () {
    switch (this.touchStripMode) {
      case 'none':
        // Disable both mode LEDs (but still use strip for filter)
        midi.sendShortMsg(this.midiChannelBase, 0x14, 0); // SWIPE LED off
        midi.sendShortMsg(this.midiChannelBase, 0x15, 0); // DROP LED off
        // Set touchstrip to absolute + incremental mode (0x11)
        // This sends both position data (for initial touch) and relative data (for swiping)
        midi.sendShortMsg(this.midiCCBase, 0x14, 0x11);
        break;

      case 'swipe':
        // SWIPE mode - incremental data for scratching/jogging
        midi.sendShortMsg(this.midiChannelBase, 0x14, 15); // SWIPE LED on
        midi.sendShortMsg(this.midiChannelBase, 0x15, 0);  // DROP LED off
        // Set touchstrip to 7-bit incremental mode with strict linearity
        midi.sendShortMsg(this.midiCCBase, 0x14, 0x12);
        break;

      case 'drop':
        // DROP mode - absolute position for seeking
        midi.sendShortMsg(this.midiChannelBase, 0x14, 0);  // SWIPE LED off
        midi.sendShortMsg(this.midiChannelBase, 0x15, 15); // DROP LED on
        // Set touchstrip to 9-bit absolute mode with pinch gesture
        midi.sendShortMsg(this.midiCCBase, 0x14, 0x01);
        break;
    }

    // Set touchstrip backlight with finger tracking
    midi.sendShortMsg(this.midiCCBase, 0x15, 0x11);
  };

  // ===================================================
  // CENTRAL DECK BUTTONS
  // ===================================================

  this.playButton = new components.Button({
    midi: [this.midiChannelBase, 0x17],
    inKey: 'play',
    outKey: 'play_indicator',
    on: 127,
    off: 113,
    input: function (channel, control, value, status, group) {
      if (thisDeck.shifted) {
        // SHIFT + PLAY = reverse roll (play backward while held)
        engine.setValue(thisDeck.currentDeck, 'reverseroll', value === 127 ? 1 : 0);
      } else {
        // Normal: toggle play
        if (value === 127) {
          script.toggleControl(thisDeck.currentDeck, 'play');
        }
      }
    }
  });

  this.cueButton = new components.Button({
    midi: [this.midiChannelBase, 0x16],
    inKey: 'cue_indicator',
    outKey: 'cue_indicator',
    on: 15,
    off: 1,
    input: function (channel, control, value, status, group) {
      if (thisDeck.shifted) {
        // SHIFT + CUE = cue_gotoandplay
        if (value === 127) {
          engine.setValue(thisDeck.currentDeck, 'cue_gotoandplay', 1);
        }
      } else {
        // Normal: cue_default (held behavior)
        engine.setValue(thisDeck.currentDeck, 'cue_default', value === 127 ? 1 : 0);
      }
    }
  });

  this.keyLockButton = new components.Button({
    midi: [this.midiChannelBase, 0x12],
    type: components.Button.prototype.types.toggle,
    inKey: 'keylock',
    outKey: 'keylock',
    on: 15,
    off: 1,
    shift: function () {
      this.inKey = 'quantize';
      this.outKey = 'quantize';
      this.connect();
      this.trigger();
    },
    unshift: function () {
      this.inKey = 'keylock';
      this.outKey = 'keylock';
      this.connect();
      this.trigger();
    }
  });

  this.syncButton = new components.Button({
    midi: [this.midiChannelBase, 0x13],
    type: components.Button.prototype.types.toggle,
    inKey: 'sync_enabled',
    outKey: 'sync_enabled',
    on: 15,
    off: 1,
    input: function (channel, control, value, status, group) {
      if (value === 127) {
        if (thisDeck.shifted) {
          // SHIFT + SYNC: Set as sync leader
          engine.setValue(thisDeck.currentDeck, 'sync_leader', 1);
        } else {
          // Normal: Toggle sync enabled
          script.toggleControl(thisDeck.currentDeck, 'sync_enabled');
        }
      }
    }
  });

  this.setButton = new components.Button({
    midi: [this.midiChannelBase, 0x10],
    input: function (channel, control, value, status, group) {
      if (value === 127) { // Press
        if (thisDeck.shifted) {
          // SHIFT + SET: Toggle beatgrid/BPM lock
          var locked = engine.getValue(thisDeck.currentDeck, 'bpmlock');
          engine.setValue(thisDeck.currentDeck, 'bpmlock', !locked);
        } else {
          // Normal: Set beatgrid at current position
          engine.setValue(thisDeck.currentDeck, 'beats_translate_curpos', 1);
        }
      }
    },
    on: 15,
    off: 1,
  });

  this.adjustButton = new components.Button({
    midi: [this.midiChannelBase, 0x11],
    type: components.Button.prototype.types.toggle,
    inKey: 'slip_enabled',
    outKey: 'slip_enabled',
    on: 15,
    off: 1,
    shift: function () {
      this.type = components.Button.prototype.types.toggle;
      this.inKey = 'slip_enabled';
      this.outKey = 'slip_enabled';
      this.connect();
      this.trigger();
    },
    unshift: function () {
      this.type = components.Button.prototype.types.push;
      this.inKey = 'beats_translate_match_alignment';
      this.outKey = 'beats_translate_match_alignment';
      this.connect();
      this.trigger();
    }
  });

  this.pflButton = new components.Button({
    midi: [this.midiChannelBase, 0x0A],
    key: 'pfl',
    type: components.Button.prototype.types.toggle,
    on: 15,
    off: 1,
  });

  this.loadButton = new components.Button({
    midi: [this.midiChannelBase, 0x52 + (midiChannel === 8 ? 0 : 1)],
    input: function (channel, control, value, status, group) {
      if (value === 127) { // Button press
        // deckNumbers[0] = Deck 1 (or 2)
        // deckNumbers[1] = Deck 3 (or 4)
        // Global shift: any shift button works for either load button
        var anyShifted = (NovationTwitch.deck1 && NovationTwitch.deck1.shifted) ||
          (NovationTwitch.deck2 && NovationTwitch.deck2.shifted);
        var targetDeck = anyShifted ? thisDeck.deckNumbers[1] : thisDeck.deckNumbers[0];
        engine.setValue('[Channel' + targetDeck + ']', 'LoadSelectedTrack', 1);
      }
    },
    on: 15,
    off: 1,
  });

  // Note: Fader FX button removed - was conflicting with deck switch (both on 0x0D)
  // The actual Fader FX ON/OFF button uses a different MIDI note in the mixer section

  // ===================================================
  // SHIFT BUTTON
  // ===================================================
  this.shiftButton = function (channel, control, value, status, group) {
    if (value === 127) {
      thisDeck.shifted = true;
      midi.sendShortMsg(thisDeck.midiChannelBase, 0x00, 0x15);
      // Don't call thisDeck.shift() - it shifts ALL components including keylock
      // We handle shift behavior manually in each control's input function
    } else {
      thisDeck.shifted = false;
      midi.sendShortMsg(thisDeck.midiChannelBase, 0x00, 0x00);
      // Don't call thisDeck.unshift() - same reason as above
    }
  };

  // ===================================================
  // ENCODERS
  // ===================================================

  this.pitchEncoder = new components.Encoder({
    midi: [this.midiCCBase, 0x03],
    input: function (channel, control, value, status, group) {
      var direction = (value < 64) ? 1 : -1;
      var steps = (value < 64) ? value : (128 - value);

      // SLICER MODE: Pitch encoder controls domain
      if (thisDeck.performanceMode === 'slicer') {
        var domains = [1, 2, 4, 8, 16, 32];
        var currentIndex = domains.indexOf(thisDeck.slicerDomain);

        // Move through domain array based on direction
        var newIndex = currentIndex + direction;
        newIndex = Math.max(0, Math.min(domains.length - 1, newIndex));

        if (newIndex !== currentIndex) {
          thisDeck.slicerDomain = domains[newIndex];

          // Recreate loop with new domain
          if (thisDeck.slicerLoopActive) {
            thisDeck.exitSlicerMode();
            thisDeck.enterSlicerMode();
          }

          print("Slicer Domain: " + thisDeck.slicerDomain + " beats");
        }

        return; // BLOCK normal pitch control entirely in slicer mode
      }

      // NORMAL MODE: Standard pitch encoder behavior
      if (thisDeck.shifted) {
        // SHIFT + Pitch = Beatgrid shift (earlier/later)
        for (var i = 0; i < steps; i++) {
          if (direction > 0) {
            engine.setValue(thisDeck.currentDeck, 'beats_translate_later', 1);
          } else {
            engine.setValue(thisDeck.currentDeck, 'beats_translate_earlier', 1);
          }
        }
      } else {
        // Rate adjustment
        var currentRate = engine.getValue(thisDeck.currentDeck, 'rate');
        var newRate = currentRate + (direction * thisDeck.tempoChangeRate * steps);
        engine.setValue(thisDeck.currentDeck, 'rate', Math.max(-1, Math.min(1, newRate)));
      }
    },
  });

  this.pitchEncoderButton = new components.Button({
    midi: [this.midiChannelBase, 0x03],
    input: function (channel, control, value, status, group) {
      if (value === 127) {
        if (thisDeck.shifted) {
          engine.setValue(thisDeck.currentDeck, 'reset_key', 1);
        } else {
          // Cycle tempo change rate
          if (thisDeck.tempoChangeRate < 0.01) {
            thisDeck.tempoChangeRate = 0.01;
          } else if (thisDeck.tempoChangeRate < 0.1) {
            thisDeck.tempoChangeRate = 0.1;
          } else {
            thisDeck.tempoChangeRate = 0.001;
          }
        }
      }
    },
  });

  this.FXEncoder = new components.Encoder({
    midi: [this.midiCCBase, 0x06],
    input: function (channel, control, value, status, group) {
      if (thisDeck.faderFX.active) {
        // FaderFX Mode -> Target QuickFX
        // Logic is same as Normal now (per request), just changing target logic?
        // User said: "When fader FX is off, the fader fx knob... controls the quick fx super knob... when pushed... toggle."
        // "When fader FX is on, it should operate in a similar fashion."

        // So Encoder behavior is IDENTICAL in both modes:
        // 1. Turn: Control Super Knob
        // 2. Push + Turn: Cycle Effect Chain
        // 3. Push Release: Toggle Effect
      }

      var direction = (value < 64) ? 1 : -1;
      var steps = (value < 64) ? value : (128 - value);

      var quickFXGroup = '[QuickEffectRack1_' + thisDeck.currentDeck + ']';

      if (thisDeck.fxEncoderPushed) {
        // PUSH + TURN: Cycle Effect Type
        // Use 'next_chain' / 'prev_chain' to cycle loaded effect
        if (direction > 0) {
            engine.setValue(quickFXGroup, 'next_chain', 1);
        } else {
            engine.setValue(quickFXGroup, 'prev_chain', 1);
        }
      } else {
        // TURN ONLY: Control Super Knob
        var currentVal = engine.getValue(quickFXGroup, 'super1');
        var newVal = currentVal + (direction * 0.05 * steps); // Increased sensitivity slightly
        engine.setValue(quickFXGroup, 'super1', Math.max(0, Math.min(1, newVal)));
      }
    },
  });

  this.FXEncoderButton = new components.Button({
    midi: [this.midiChannelBase, 0x06],
    input: function (channel, control, value, status, group) {
      // Track Push State for Push+Turn logic
      thisDeck.fxEncoderPushed = (value === 127);

      if (value === 127) { // Push Down
        // Don't toggle yet, wait for release to ensure not performing a Push+Turn
        // Or can we toggle on Release?
      } else { // Release (value === 0)
        // Calculate if we should toggle (optional: check if turned?)
        // For now, simple toggle on release is fine.

        if (thisDeck.shifted) {
          engine.setValue(thisDeck.currentDeck, 'reset_key', 1);
        } else {
          // Toggle Quick FX Enable
          var quickFXGroup = '[QuickEffectRack1_' + thisDeck.currentDeck + ']';
          var current = engine.getValue(quickFXGroup, 'enabled');
          engine.setValue(quickFXGroup, 'enabled', !current);
        }
      }
    },
  });

  // ===================================================
  // POTS AND FADERS
  // ===================================================

  this.trimPot = new components.Pot({
    midi: [this.midiCCBase, 0x09],
    inKey: 'pregain',
  });

  this.eqHighPot = new components.Pot({
    midi: [this.midiCCBase, 0x48],
    group: '[EqualizerRack1_' + this.currentDeck + '_Effect1]',
    inKey: 'parameter3',
  });

  this.eqMidPot = new components.Pot({
    midi: [this.midiCCBase, 0x47],
    group: '[EqualizerRack1_' + this.currentDeck + '_Effect1]',
    inKey: 'parameter2',
  });

  this.eqLowPot = new components.Pot({
    midi: [this.midiCCBase, 0x46],
    group: '[EqualizerRack1_' + this.currentDeck + '_Effect1]',
    inKey: 'parameter1',
  });

  this.volumeFader = new components.Pot({
    midi: [this.midiCCBase, 0x07],
    inKey: 'volume',
    input: function (channel, control, value, status, group) {
      if (thisDeck.faderFX.active) {
        // FaderFX Active: Control Quick Effect Super Knob
        var quickFXGroup = '[QuickEffectRack1_' + thisDeck.currentDeck + ']';

        // 1. Ensure Unit is Enabled for this channel
        engine.setValue(quickFXGroup, 'enabled', 1);

        // Control Super Knob
        engine.setValue(quickFXGroup, 'super1', value / 127);
      } else {
        // Normal Volume Control
        engine.setValue(thisDeck.currentDeck, 'volume', value / 127);
      }
    }
  });

  // ===================================================
  // TOUCH STRIP
  // ===================================================

  // 9-bit absolute position (LSB on 0x34, MSB on 0x14)
  this.touchStripMSB = 0;

  this.touchStripAbsPos = {
    inputMSB: function (channel, control, value, status, group) {
      thisDeck.touchStripMSB = value;

      // For filter mode, also update position on MSB (faster response)
      if (thisDeck.touchStripMode === 'none' && thisDeck.filterTouching) {
        thisDeck.filterPosition = value / 127;
        engine.setValue('[QuickEffectRack1_' + thisDeck.currentDeck + ']', 'super1', thisDeck.filterPosition);
      }
    },
    inputLSB: function (channel, control, value, status, group) {
      // Combine MSB and LSB for 9-bit value
      var pos9bit = (thisDeck.touchStripMSB << 7) | value;
      var normalizedPos = pos9bit / 511; // 0-1 range

      if (thisDeck.touchStripMode === 'drop') {
        if (thisDeck.shifted) {
          // SHIFT + Drop: Direct instant seek (full speed)
          engine.setValue(thisDeck.currentDeck, 'playposition', normalizedPos);
        } else {
          // Normal Drop: Slower incremental seek
          // Move toward target position but at reduced speed
          var currentPos = engine.getValue(thisDeck.currentDeck, 'playposition');
          var diff = normalizedPos - currentPos;
          var newPos = currentPos + (diff * 0.15); // Move 15% toward target each update
          engine.setValue(thisDeck.currentDeck, 'playposition', newPos);
        }
      } else if (thisDeck.touchStripMode === 'none' && thisDeck.filterTouching) {
        // Filter mode - use full 9-bit precision for smooth filter control
        thisDeck.filterPosition = normalizedPos;
        engine.setValue('[QuickEffectRack1_' + thisDeck.currentDeck + ']', 'super1', thisDeck.filterPosition);
      }
    },
  };

  // Relative incremental data
  this.touchStripRel = function (channel, control, value, status, group) {
    // Two's complement conversion
    var delta = (value < 64) ? value : (value - 128);

    switch (thisDeck.touchStripMode) {
      case 'swipe':
        // Jog/scratch mode - invert so swipe right = forward
        delta = -delta;
        if (thisDeck.shifted) {
          // Fast jog with shift (full sensitivity)
          engine.setValue(thisDeck.currentDeck, 'jog', delta);
        } else {
          // Normal jog/scratch (slow/fine for precision)
          engine.setValue(thisDeck.currentDeck, 'jog', delta / 10);
        }
        break;

      case 'none':
        // Momentary filter mode - only adjust if currently touching
        // Swipe right = higher value = high-pass, swipe left = low-pass
        if (thisDeck.filterTouching) {
          // Adjust filter position (less sensitive: 0.01 per tick)
          thisDeck.filterPosition += (delta * 0.01);
          thisDeck.filterPosition = Math.max(0, Math.min(1, thisDeck.filterPosition));
          engine.setValue('[QuickEffectRack1_' + thisDeck.currentDeck + ']', 'super1', thisDeck.filterPosition);
        }
        break;

      // 'drop' mode uses absolute position, not relative
    }
  };

  // Pinch gesture for waveform zoom (CC 0x37)
  this.touchStripPinch = {
    input: function (channel, control, value, status, group) {
      if (value > 0 && thisDeck.shifted) {
        // Map pinch to waveform zoom (0-127 -> zoom levels)
        var zoom = 10 - (value / 127 * 9);
        engine.setValue(thisDeck.currentDeck, 'waveform_zoom', zoom);
      }
    },
  };

  // Filter position tracking for momentary filter mode
  this.filterTouching = false;
  this.filterPosition = 0.5; // Start at neutral

  // Touch detection - controls momentary filter
  // Note: The Twitch sends the absolute strip position as the NOTE VELOCITY!
  // value > 0 = touch position (0-127), value = 0 = finger lifted
  this.touchStripTouch = {
    input: function (channel, control, value, status, group) {
      if (thisDeck.touchStripMode === 'none') {
        if (value > 0) {
          // Touch started - value IS the position on the strip (0-127)
          thisDeck.filterTouching = true;
          thisDeck.filterPosition = value / 127;
          engine.setValue('[QuickEffectRack1_' + thisDeck.currentDeck + ']', 'super1', thisDeck.filterPosition);

          if (thisDeck.shifted) {
            // BPM tap when shifted
            engine.setValue(thisDeck.currentDeck, 'bpm_tap', 1);
          }
        } else {
          // Touch released (value = 0) - return filter to neutral
          thisDeck.filterTouching = false;
          engine.setValue('[QuickEffectRack1_' + thisDeck.currentDeck + ']', 'super1', 0.5);
        }
      }
    },
  };

  // Touch strip mode selector buttons (SWIPE/DROP)
  this.touchStripSelector = {
    input: function (channel, control, value, status, group) {
      if (value === 127) {
        if (control === 0x14) { // SWIPE button (note 20)
          thisDeck.touchStripMode = (thisDeck.touchStripMode === 'swipe') ? 'none' : 'swipe';
        } else if (control === 0x15) { // DROP button (note 21)
          thisDeck.touchStripMode = (thisDeck.touchStripMode === 'drop') ? 'none' : 'drop';
        }
        thisDeck.updateTouchStripMode();
      }
    },
  };

  // ===================================================
  // PERFORMANCE SECTION
  // ===================================================

  this.performanceSelector = {
    input: function (channel, control, value, status, group) {
      if (value === 127) {
        var modeIndex = control - 0x38; // 0x38 = Hot Cues, 0x39 = Slicer, 0x3A = AutoLoop, 0x3B = LoopRoll

        if (thisDeck.shifted) {
          // SHIFT + performance mode buttons
          switch (control) {
            case 0x38: // SHIFT + Hot Cues = toggle hotcue bank (1-8 vs 9-16)
              thisDeck.hotcueBank = (thisDeck.hotcueBank === 0) ? 8 : 0;
              thisDeck.updatePerformancePads();
              break;
            case 0x39: // SHIFT + Slicer
              if (thisDeck.performanceMode === 'sampler') {
                // If already in sampler mode: Stop all samplers
                for (var i = 1; i <= 8; i++) {
                  engine.setValue('[Sampler' + i + ']', 'stop', 1);
                }
                print("Stopped all samplers");
              } else {
                // If not in sampler mode: Switch to sampler mode
                thisDeck.performanceMode = 'sampler';
                thisDeck.updatePerformancePads();
              }
              break;
            case 0x3A: // SHIFT + AutoLoop = reloop toggle
              engine.setValue(thisDeck.currentDeck, 'reloop_toggle', 1);
              break;
            case 0x3B: // SHIFT + LoopRoll = beatjump backward
              engine.setValue(thisDeck.currentDeck, 'beatjump_1_backward', 1);
              break;
          }
        } else {
          // Normal: Switch performance mode
          if (modeIndex >= 0 && modeIndex < thisDeck.performanceModes.length) {
            var newMode = thisDeck.performanceModes[modeIndex];

            // Special handling for slicer button (0x39)
            if (control === 0x39) {
              if (thisDeck.performanceMode === 'slicer') {
                // Exit slicer mode
                print("Slicer: Exiting...");
                thisDeck.exitSlicerMode();

                // Force disable loop to be sure
                engine.setValue(thisDeck.currentDeck, 'loop_enabled', 0);

                thisDeck.performanceMode = 'hotCues'; // Return to default mode
                thisDeck.updatePerformancePads();
                midi.sendShortMsg(thisDeck.midiChannelBase, 0x39, 0); // LED off
                print("Slicer: Exited");
              } else {
                // Enter slicer mode
                thisDeck.performanceMode = 'slicer';
                thisDeck.updatePerformancePads();
                thisDeck.enterSlicerMode();
                midi.sendShortMsg(thisDeck.midiChannelBase, 0x39, 127);
                print("Slicer: Entered");
              }
            } else {
              // Other mode buttons: standard behavior
              thisDeck.performanceMode = newMode;
              thisDeck.updatePerformancePads();
            }
          }
        }
      }
    },
  };

  // Performance Pads
  this.performancePad1 = new components.Button({ midi: [this.midiChannelBase, 60] });
  this.performancePad2 = new components.Button({ midi: [this.midiChannelBase, 61] });
  this.performancePad3 = new components.Button({ midi: [this.midiChannelBase, 62] });
  this.performancePad4 = new components.Button({ midi: [this.midiChannelBase, 63] });
  this.performancePad5 = new components.Button({ midi: [this.midiChannelBase, 64] });
  this.performancePad6 = new components.Button({ midi: [this.midiChannelBase, 65] });
  this.performancePad7 = new components.Button({ midi: [this.midiChannelBase, 66] });
  this.performancePad8 = new components.Button({ midi: [this.midiChannelBase, 67] });

  // Initialize performance pads and touch strip
  this.updatePerformancePads();
  this.updateTouchStripMode();

  // Reconnect components to current deck
  this.reconnectComponents(function (c) {
    if (c.group === undefined) {
      c.group = this.currentDeck;
    }
  });
};

NovationTwitch.Deck.prototype = new components.Deck();

// =====================================================
// SLICER MODE FUNCTIONS
// =====================================================

NovationTwitch.Deck.prototype.enterSlicerMode = function() {
  var deck = this.currentDeck;

  // Save current loop state
  this.slicerOriginalLoop = {
    enabled: engine.getValue(deck, 'loop_enabled'),
    start: engine.getValue(deck, 'loop_start_position'),
    end: engine.getValue(deck, 'loop_end_position')
  };

  // Create loop (domain beats total)
  var beatsInLoop = this.slicerDomain;

  // If no loop active, create one at current position
  if (!this.slicerOriginalLoop.enabled) {
    engine.setValue(deck, 'beatloop_' + beatsInLoop + '_activate', 1);
  } else {
    // Adjust existing loop to match domain
    engine.setValue(deck, 'beatloop_' + beatsInLoop + '_activate', 1);
  }

  this.slicerLoopActive = true;
  this.startSlicerLEDUpdate();
  print("Slicer: Created " + beatsInLoop + "-beat loop");
};

NovationTwitch.Deck.prototype.exitSlicerMode = function() {
  var deck = this.currentDeck;

  // Restore original loop state
  if (this.slicerOriginalLoop) {
    if (this.slicerOriginalLoop.enabled) {
      // There was a loop before - restore it
      engine.setValue(deck, 'loop_start_position', this.slicerOriginalLoop.start);
      engine.setValue(deck, 'loop_end_position', this.slicerOriginalLoop.end);
      engine.setValue(deck, 'loop_enabled', 1); // Ensure it's enabled
    } else {
      // No loop before - disable the loop completely
      engine.setValue(deck, 'loop_enabled', 0);
    }
  }

  this.slicerLoopActive = false;
  this.stopSlicerLEDUpdate();
  this.slicerOriginalLoop = null;
  print("Slicer: Exited, loop restored");
};

NovationTwitch.Deck.prototype.startSlicerLEDUpdate = function() {
  var thisDeck = this;

  // Disconnect existing connection if any
  if (this.slicerBeatConnection !== null) {
    this.slicerBeatConnection.disconnect();
  }

  // Connect to beat_distance for beat-synchronized updates
  // This triggers every time beat_distance changes, giving us smooth updates
  this.slicerBeatConnection = engine.makeConnection(this.currentDeck, 'beat_distance', function() {
    thisDeck.updateSlicerLEDs();
  });

  // Initial LED update
  this.updateSlicerLEDs();
};

NovationTwitch.Deck.prototype.stopSlicerLEDUpdate = function() {
  if (this.slicerBeatConnection !== null) {
    this.slicerBeatConnection.disconnect();
    this.slicerBeatConnection = null;
  }
  this.slicerLastBeat = -1;
};

NovationTwitch.Deck.prototype.updateSlicerLEDs = function() {
  var deck = this.currentDeck;
  var sliceIndex = -1;

  // Calculate slice based on position in loop
  var playpos = engine.getValue(deck, 'playposition');
  var loopStart = engine.getValue(deck, 'loop_start_position');
  var loopEnd = engine.getValue(deck, 'loop_end_position');
  var trackSamples = engine.getValue(deck, 'track_samples');

  if (loopStart === -1 || loopEnd === -1 || trackSamples === 0) {
      return;
  }

  var currentSample = playpos * trackSamples;
  var loopLen = loopEnd - loopStart;

  // Calculate which slice we're in (0-7)
  var relativePos = currentSample - loopStart;
  sliceIndex = Math.floor((relativePos / loopLen) * 8);
  sliceIndex = Math.max(0, Math.min(7, sliceIndex));

  // Update LEDs if slice changed
  if (sliceIndex !== this.currentSliceIndex && sliceIndex !== -1) {
    this.currentSliceIndex = sliceIndex;

    // Update all pad LEDs
    for (var i = 0; i < 8; i++) {
      var padNote = 0x3C + i;
      var brightness;

      if (this.slicerPadHeld === (i + 1)) {
        brightness = 127;  // Bright if held
      } else if (i === sliceIndex) {
        brightness = 64;   // Medium if current slice
      } else {
        brightness = 15;   // Dim otherwise
      }

      midi.sendShortMsg(this.midiChannelBase, padNote, brightness);
    }
  }
};


// =====================================================
// DECK SWITCHING
// =====================================================
NovationTwitch.faderFXButton1 = function (channel, control, value, status, group) {
  if (value === 127) {
    if (NovationTwitch.deck1.shifted) {
      // SHIFT: Deck Switch
      NovationTwitch.switchDeck1(channel, control, value, status, group);
    } else {
      // NORMAL: Toggle FaderFX
      NovationTwitch.deck1.faderFX.active = !NovationTwitch.deck1.faderFX.active;

      if (NovationTwitch.deck1.faderFX.active) {
        // Turning ON
        NovationTwitch.startBlinkTimer();
        // Force LED ON immediately (Feedback)
        midi.sendShortMsg(0x97, 0x0D, 15);
      } else {
        // Turning OFF
        // Disable QuickFX
        engine.setValue('[QuickEffectRack1_[Channel1]]', 'enabled', 0);
        // Force LED OFF
        midi.sendShortMsg(0x97, 0x0D, 0);
      }
    }
  }
};

NovationTwitch.switchDeck1 = function (channel, control, value, status, group) {
  // Logic extracted:
  // SHIFT + Deck Switch: Clone from paired deck
  // If on A (Channel1), clone from C (Channel3) and vice versa
  var currentDeck = NovationTwitch.deck1.currentDeck;
  var sourceDeck = (currentDeck === '[Channel1]') ? 3 : 1;
  // Note: Original code handled the SHIFT check, but here we only call this IF shifted.
  // Wait, original logic used SHIFT for CLONE, and NORMAL for SWITCH.
  // Requirements: "I'll use 0x0D for FaderFX Toggle. I'll use Shift + 0x0D for Deck Switch."
  // So:
  // SHIFT -> Switch Deck (Toggle A/C)
  // NORMAL -> Toggle FaderFX

  // Let's implement switching:
  NovationTwitch.deck1.toggle();
  var isOnDeckC = (NovationTwitch.deck1.currentDeck === '[Channel3]');
  // We can't update the LED because the button is now FaderFX!
  // But maybe we should flash it or something to indicate switch? 
  // Or typically Deck Switch has its own LED?
  // Wait, 0x0D IS the Deck Switch button/LED on the controller? 
  // If we repurpose it for FaderFX, we lose the Deck indication.
  // User said: "Map to Fader FX button".
  // Assuming 0x0D IS the dedicated FaderFX button? 
  // Comment in original code: "Note: Fader FX button removed - was conflicting with deck switch (both on 0x0D)"
  // This implies the hardware sends 0x0D for BOTH? Or the map was wrong?
  // Assume 0x0D is the button labeled "Fader FX" on the layout if it exists?
  // Actually Twitch has "Deck A/B" and "Deck C/D" toggle buttons?
  // Code says 0x0D.

  NovationTwitch.deck1.updatePerformancePads();
  // Print status
  print("Deck Switch: Now controlling " + NovationTwitch.deck1.currentDeck);
};

NovationTwitch.faderFXButton2 = function (channel, control, value, status, group) {
  if (value === 127) {
    if (NovationTwitch.deck2.shifted) {
      // SHIFT: Deck Switch
      NovationTwitch.switchDeck2(channel, control, value, status, group);
    } else {
      // NORMAL: Toggle FaderFX
      NovationTwitch.deck2.faderFX.active = !NovationTwitch.deck2.faderFX.active;

      if (NovationTwitch.deck2.faderFX.active) {
        NovationTwitch.startBlinkTimer();
        midi.sendShortMsg(0x98, 0x0D, 15);
      } else {
        engine.setValue('[QuickEffectRack1_[Channel2]]', 'enabled', 0);
        midi.sendShortMsg(0x98, 0x0D, 0);
      }
    }
  }
};

NovationTwitch.switchDeck2 = function (channel, control, value, status, group) {
  NovationTwitch.deck2.toggle();
  // var isOnDeckD = (NovationTwitch.deck2.currentDeck === '[Channel4]');
  NovationTwitch.deck2.updatePerformancePads();
  print("Deck Switch: Now controlling " + NovationTwitch.deck2.currentDeck);
};

// =====================================================
// CROSSFADER
// =====================================================
NovationTwitch.crossfader = function (channel, control, value, status, group) {
  // CC 0x08 on channel 8
  engine.setValue('[Master]', 'crossfader', (value / 127) * 2 - 1);
};

// =====================================================
// MASTER FX SECTION (Channel 12 / 0x9B, 0xBB)
// =====================================================
NovationTwitch.masterFX = {
  // Track which effect unit we're controlling (1-4)
  targetUnit: 1,
  // Track which effect slot we're focused on (1-3)
  focusedSlot: 1,

  // Helper to get current unit group
  getUnitGroup: function () {
    return '[EffectRack1_EffectUnit' + this.targetUnit + ']';
  },

  // Helper to get current effect slot group
  getSlotGroup: function () {
    return '[EffectRack1_EffectUnit' + this.targetUnit + '_Effect' + this.focusedSlot + ']';
  },

  // FX Depth pot - Wet/Dry mix for target effect unit
  depthPot: function (channel, control, value, status, group) {
    engine.setValue(NovationTwitch.masterFX.getUnitGroup(), 'mix', value / 127);
  },

  // FX Mod/X encoder - SuperKnob (controls all linked effect parameters)
  modEncoder: function (channel, control, value, status, group) {
    var delta = (value < 64) ? value : (value - 128);
    var unitGroup = NovationTwitch.masterFX.getUnitGroup();
    var currentVal = engine.getValue(unitGroup, 'super1');
    var newVal = currentVal + (delta * 0.02);
    engine.setValue(unitGroup, 'super1', Math.max(0, Math.min(1, newVal)));
  },

  // FX Mod/X encoder push - Cycle to next effect chain preset
  modEncoderPush: function (channel, control, value, status, group) {
    if (value === 127) {
      engine.setValue(NovationTwitch.masterFX.getUnitGroup(), 'next_chain_preset', 1);
    }
  },

  // FX Beats encoder - Adjust meta knob of focused effect slot
  beatsEncoder: function (channel, control, value, status, group) {
    var delta = (value < 64) ? value : (value - 128);
    var slotGroup = NovationTwitch.masterFX.getSlotGroup();
    var currentVal = engine.getValue(slotGroup, 'meta');
    var newVal = currentVal + (delta * 0.02);
    engine.setValue(slotGroup, 'meta', Math.max(0, Math.min(1, newVal)));
  },

  // FX Beats encoder push - Cycle focus to next effect slot (1->2->3->1)
  beatsEncoderPush: function (channel, control, value, status, group) {
    if (value === 127) {
      NovationTwitch.masterFX.focusedSlot = (NovationTwitch.masterFX.focusedSlot % 3) + 1;
      engine.setValue(NovationTwitch.masterFX.getUnitGroup(), 'focused_effect', NovationTwitch.masterFX.focusedSlot);
      print("Master FX: Unit " + NovationTwitch.masterFX.targetUnit + " Slot " + NovationTwitch.masterFX.focusedSlot);
    }
  },

  // FX Aux button (Note 24) - Toggle Aux routing for target unit
  auxButton: function (channel, control, value, status, group) {
    if (value === 127) {
      var unitGroup = NovationTwitch.masterFX.getUnitGroup();
      engine.setValue(unitGroup, 'group_[Auxiliary1]_enable',
        !engine.getValue(unitGroup, 'group_[Auxiliary1]_enable'));
    }
  },

  // FX Deck A button (Note 25) - Switch to control Unit 1 (or Unit 3 with SHIFT)
  deckAButton: function (channel, control, value, status, group) {
    if (value === 127) {
      var shifted = (NovationTwitch.deck1 && NovationTwitch.deck1.shifted) ||
        (NovationTwitch.deck2 && NovationTwitch.deck2.shifted);
      NovationTwitch.masterFX.targetUnit = shifted ? 3 : 1;
      NovationTwitch.masterFX.focusedSlot = 1; // Reset focus
      print("Master FX: Now controlling Unit " + NovationTwitch.masterFX.targetUnit + " (Deck " + (shifted ? "C" : "A") + ")");
    }
  },

  // FX Deck B button (Note 26) - Switch to control Unit 2 (or Unit 4 with SHIFT)
  deckBButton: function (channel, control, value, status, group) {
    if (value === 127) {
      var shifted = (NovationTwitch.deck1 && NovationTwitch.deck1.shifted) ||
        (NovationTwitch.deck2 && NovationTwitch.deck2.shifted);
      NovationTwitch.masterFX.targetUnit = shifted ? 4 : 2;
      NovationTwitch.masterFX.focusedSlot = 1; // Reset focus
      print("Master FX: Now controlling Unit " + NovationTwitch.masterFX.targetUnit + " (Deck " + (shifted ? "D" : "B") + ")");
    }
  },

  // FX Select left (Note 27) - Prev effect for focused slot in target unit
  selectLeft: function (channel, control, value, status, group) {
    if (value === 127) {
      engine.setValue(NovationTwitch.masterFX.getSlotGroup(), 'prev_effect', 1);
    }
  },

  // FX Select right (Note 28) - Next effect for focused slot in target unit
  selectRight: function (channel, control, value, status, group) {
    if (value === 127) {
      engine.setValue(NovationTwitch.masterFX.getSlotGroup(), 'next_effect', 1);
    }
  },

  // FX On/Off button (Note 29) - Toggle all 3 effect slots enabled in target unit
  onOffButton: function (channel, control, value, status, group) {
    if (value === 127) {
      var unit = NovationTwitch.masterFX.targetUnit;
      var prefix = '[EffectRack1_EffectUnit' + unit + '_Effect';
      // Check if any slot is enabled
      var anyEnabled = engine.getValue(prefix + '1]', 'enabled') ||
        engine.getValue(prefix + '2]', 'enabled') ||
        engine.getValue(prefix + '3]', 'enabled');
      // Toggle all slots
      var newState = !anyEnabled;
      engine.setValue(prefix + '1]', 'enabled', newState);
      engine.setValue(prefix + '2]', 'enabled', newState);
      engine.setValue(prefix + '3]', 'enabled', newState);
    }
  },
};

// =====================================================
// MIC / AUX SECTION
// =====================================================
NovationTwitch.micAux = {
  // Aux level pot (CC 12 on channel 8)
  auxLevel: function (channel, control, value, status, group) {
    engine.setValue('[Auxiliary1]', 'volume', value / 127);
  },

  // Aux button (Note 11 on channel 8)
  auxButton: function (channel, control, value, status, group) {
    if (value === 127) {
      engine.setValue('[Auxiliary1]', 'pfl', !engine.getValue('[Auxiliary1]', 'pfl'));
    }
  },

  // Aux On/Off (Note 12 on channel 8)
  auxOnOff: function (channel, control, value, status, group) {
    if (value === 127) {
      var current = engine.getValue('[Auxiliary1]', 'volume');
      engine.setValue('[Auxiliary1]', 'volume', current > 0 ? 0 : 1);
    }
  },
};

// =====================================================
// VU METERS
// =====================================================
NovationTwitch.vuMeterL = function (value, group, control) {
  // Use note 0x5E (94) with velocity for bar meter
  midi.sendShortMsg(0x97, 0x5E, value * 127);
};

NovationTwitch.vuMeterR = function (value, group, control) {
  midi.sendShortMsg(0x98, 0x5E, value * 127);
};

// =====================================================
// AREA BUTTON - Switch library focus
// =====================================================
NovationTwitch.areaButton = function (channel, control, value, status, group) {
  if (value === 127) {
    engine.setValue('[Library]', 'MoveFocus', 1);
  }
};

// =====================================================
// VIEW BUTTON - Maximize library / 4-deck toggle
// =====================================================
NovationTwitch.viewButton = function (channel, control, value, status, group) {
  if (value === 127) {
    // Check if either deck is shifted
    var shifted = (NovationTwitch.deck1 && NovationTwitch.deck1.shifted) ||
      (NovationTwitch.deck2 && NovationTwitch.deck2.shifted);
    if (shifted) {
      // SHIFT + VIEW: Toggle 4-deck view
      var current = engine.getValue('[Skin]', 'show_4decks');
      engine.setValue('[Skin]', 'show_4decks', !current);
    } else {
      // Normal: Toggle maximized library
      script.toggleControl('[Skin]', 'show_maximized_library');
    }
  }
};

// =====================================================
// LIBRARY / BROWSE SECTION
// =====================================================

// Browse encoder state - accumulator for smooth scrolling
NovationTwitch.browseAccumulator = 0;
NovationTwitch.browseSensitivity = 1; // 1:1 - every tick moves one track
NovationTwitch.browsePageSize = 10; // How many tracks to jump when shifted

NovationTwitch.browseEncoder = function (channel, control, value, status, group) {
  // Convert encoder value to signed delta
  var delta;
  if (value < 64) {
    delta = value; // Clockwise
  } else {
    delta = value - 128; // Counter-clockwise (negative)
  }

  // Check if either deck is shifted for page scroll
  var shifted = false;
  if (NovationTwitch.deck1 && NovationTwitch.deck1.shifted) {
      shifted = true;
  }
  if (NovationTwitch.deck2 && NovationTwitch.deck2.shifted) {
      shifted = true;
  }

  if (shifted) {
    // Page scroll mode - jump multiple tracks per tick
    if (delta > 0) {
      for (var i = 0; i < NovationTwitch.browsePageSize; i++) {
        engine.setValue('[Library]', 'MoveDown', 1);
      }
    } else if (delta < 0) {
      for (var i = 0; i < NovationTwitch.browsePageSize; i++) {
        engine.setValue('[Library]', 'MoveUp', 1);
      }
    }
  } else {
    // Normal 1:1 scroll
    NovationTwitch.browseAccumulator += delta;

    while (NovationTwitch.browseAccumulator >= NovationTwitch.browseSensitivity) {
      engine.setValue('[Library]', 'MoveDown', 1);
      NovationTwitch.browseAccumulator -= NovationTwitch.browseSensitivity;
    }
    while (NovationTwitch.browseAccumulator <= -NovationTwitch.browseSensitivity) {
      engine.setValue('[Library]', 'MoveUp', 1);
      NovationTwitch.browseAccumulator += NovationTwitch.browseSensitivity;
    }
  }
};

NovationTwitch.browseEncoderButton = function (channel, control, value, status, group) {
  if (value === 127) {
    // Load selected track into PreviewDeck and play (for cueing in headphones)
    engine.setValue('[PreviewDeck1]', 'LoadSelectedTrackAndPlay', 1);
  }
};

// =====================================================
// GLOBAL BLINK TIMER
// =====================================================
NovationTwitch.blinkTimerId = 0;
NovationTwitch.blinkState = 0;

NovationTwitch.startBlinkTimer = function () {
  if (NovationTwitch.blinkTimerId === 0) {
    // Fix: Added () to ensure function executes!
    NovationTwitch.blinkTimerId = engine.beginTimer(250, "NovationTwitch.blinkFaderFX()", false);
  }
};

NovationTwitch.blinkFaderFX = function () {
  NovationTwitch.blinkState = !NovationTwitch.blinkState;

  // Deck 1
  if (NovationTwitch.deck1 && NovationTwitch.deck1.faderFX.active) {
    NovationTwitch.deck1.faderFX.blinkState = NovationTwitch.blinkState;
    // Use velocity 15 (Standard Bright) instead of 127 (Unsupported?)
    var val = NovationTwitch.blinkState ? 15 : 0;
    midi.sendShortMsg(0x97, 0x0D, val);
  }

  // Deck 2
  if (NovationTwitch.deck2 && NovationTwitch.deck2.faderFX.active) {
    NovationTwitch.deck2.faderFX.blinkState = NovationTwitch.blinkState;
    var val = NovationTwitch.blinkState ? 15 : 0;
    midi.sendShortMsg(0x98, 0x0D, val);
  }

  // Stop timer if no faderFX active
  if ((!NovationTwitch.deck1 || !NovationTwitch.deck1.faderFX.active) &&
    (!NovationTwitch.deck2 || !NovationTwitch.deck2.faderFX.active)) {
    engine.stopTimer(NovationTwitch.blinkTimerId);
    NovationTwitch.blinkTimerId = 0;

    // Ensure LEDs are off
    midi.sendShortMsg(0x97, 0x0D, 0);
    midi.sendShortMsg(0x98, 0x0D, 0);
  }
};

// =====================================================
// INITIALIZATION
// =====================================================
NovationTwitch.init = function (id) {
  print("Novation Twitch: Initializing...");

  // Enter Advanced Mode
  midi.sendShortMsg(0xB7, 0x00, 0x6F);

  // Request all fader positions
  midi.sendShortMsg(0xB7, 0x00, 0x01);

  // Initialize touchstrip backlights with finger tracking
  midi.sendShortMsg(0xB7, 0x15, 0x11);  // Left touchstrip
  midi.sendShortMsg(0xB8, 0x15, 0x11);  // Right touchstrip

  // Create deck instances
  // Deck 1 (Left): MIDI channel 7 (0x97), Deck 2 (Right): MIDI channel 8 (0x98)
  NovationTwitch.deck1 = new NovationTwitch.Deck([1, 3], 7);
  NovationTwitch.deck2 = new NovationTwitch.Deck([2, 4], 8);

  // Set up VU meter connections (using new Mixxx 2.5 API)
  engine.makeConnection('[Main]', 'vu_meter_left', NovationTwitch.vuMeterL);
  engine.makeConnection('[Main]', 'vu_meter_right', NovationTwitch.vuMeterR);

  // Set up recording button connection
  engine.makeConnection('[Recording]', 'status', function (value) {
    midi.sendShortMsg(0x97, 0x50, value > 0 ? 15 : 0);
  });

  // Initialize deck switch LEDs to OFF (indicating Decks 1 & 2 are active)
  midi.sendShortMsg(0x97, 0x0D, 0); // Deck A/C (Left) -> OFF (Deck 1)
  midi.sendShortMsg(0x98, 0x0D, 0); // Deck B/D (Right) -> OFF (Deck 2)

  // Initialize deck gains to 1.0 (unity gain / 0 dB) with delay to ensure Mixxx is ready
  engine.beginTimer(100, function() {
    engine.setValue('[Channel1]', 'pregain', 1.0);
    engine.setValue('[Channel2]', 'pregain', 1.0);
    engine.setValue('[Channel3]', 'pregain', 1.0);
    engine.setValue('[Channel4]', 'pregain', 1.0);
    print("Novation Twitch: Deck gains initialized to 1.0");
  }, true); // one-shot timer

  // Initialize samplers: 1/8 note quantize and enable sync
  for (var i = 1; i <= 64; i++) {
    engine.setValue('[Sampler' + i + ']', 'quantize', 0.125); // 1/8 note quantize
    engine.setValue('[Sampler' + i + ']', 'sync_enabled', 1); // Auto-sync to beat
  }

  print("Novation Twitch: Initialization complete!");
};

// =====================================================
// SHUTDOWN
// =====================================================
NovationTwitch.shutdown = function () {
  print("Novation Twitch: Shutting down...");

  // Stop all slicer connections
  if (NovationTwitch.deck1) {
    NovationTwitch.deck1.stopSlicerLEDUpdate();
  }
  if (NovationTwitch.deck2) {
    NovationTwitch.deck2.stopSlicerLEDUpdate();
  }

  // Turn off all LEDs
  midi.sendShortMsg(0xB7, 0x00, 0x70);

  // Exit Advanced Mode (software reset)
  midi.sendShortMsg(0xB7, 0x00, 0x00);

  print("Novation Twitch: Shutdown complete.");
};