#!/usr/bin/env python3
"""
Automated nanoKONTROL Scene Configuration
Configures all 4 scenes for Mixxx mapping:
  Scene 1: MIDI Channel 1 (stock mapping)
  Scene 2: MIDI Channel 2 (stems A/B)
  Scene 3: MIDI Channel 3 (stems C/D)
  Scene 4: MIDI Channel 4 (samplers)
"""

import sys
import time

sys.path.insert(0, "/home/riz/apps/Nano-Basket")

from nano_basket_backend import NanoKontrolScene, NanoKontrolAlsaMidiComm


def configure_scene(scene, name, midi_channel):
    """Configure a scene with a specific MIDI channel."""
    scene.common.scene_name = name
    scene.common.scene_midi_channel = midi_channel

    # Set all blocks to use the scene MIDI channel (value 16 = Scene MIDI Ch)
    for block in scene.block:
        block.block_midi_channel = 16  # Use scene channel
        block.knob_assign_type = 1  # CC
        block.slider_assign_type = 1  # CC
        block.sw_a_assign_type = 1  # CC
        block.sw_a_switch_type = 1  # Toggle (LED latches)
        block.sw_b_assign_type = 1  # CC
        block.sw_b_switch_type = 0  # Momentary

    # Configure CC numbers for each block
    for i, block in enumerate(scene.block):
        block.knob_cc = 14 + i  # CC 14-22
        block.slider_cc = 2 + i  # CC 2-10
        block.sw_a_cc = 23 + i  # CC 23-31
        block.sw_b_cc = 33 + i  # CC 33-41

    scene.transport_midi_channel = 16  # Scene MIDI Ch


def main():
    print("=" * 50)
    print("nanoKONTROL Automated Scene Configuration")
    print("=" * 50)

    print("\nConnecting to nanoKONTROL...")
    try:
        midi = NanoKontrolAlsaMidiComm()
        midi.response_wait = 0.5  # Increase wait time
    except Exception as e:
        print(f"Error: Could not connect: {e}")
        sys.exit(1)

    # Configure 4 scenes
    scenes = [
        ("Scene 1", 0),  # MIDI Channel 1
        ("Stems AB", 1),  # MIDI Channel 2
        ("Stems CD", 2),  # MIDI Channel 3
        ("Samplers", 3),  # MIDI Channel 4
    ]

    for scene_num, (name, midi_ch) in enumerate(scenes):
        print(f"\nScene {scene_num + 1}: {name} (Ch {midi_ch + 1})")

        scene = NanoKontrolScene()
        configure_scene(scene, name, midi_ch)

        # Change to this scene first
        print("  Switching to scene...")
        midi.scene_change_request(scene_num)
        time.sleep(0.5)

        # Upload
        print("  Uploading config...")
        midi.scene_upload_request(scene.get_list())
        time.sleep(0.5)

        # Write permanently
        print("  Writing to memory...")
        midi.scene_write_request(scene_num)
        time.sleep(1)

    print("\n" + "=" * 50)
    print("Done! Scenes configured:")
    print("  1: Stock (Ch1) | 2: Stems A/B (Ch2)")
    print("  3: Stems C/D (Ch3) | 4: Samplers (Ch4)")
    print("=" * 50)


if __name__ == "__main__":
    main()
