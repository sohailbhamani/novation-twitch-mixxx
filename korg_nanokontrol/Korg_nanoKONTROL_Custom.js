// Korg nanoKONTROL Custom Mapping for Mixxx
// Scene 1: Stock (2-deck mixer)
// Scene 2: Stems Deck A+B
// Scene 3: Stems Deck C+D  
// Scene 4: Samplers

var KorgNK = {};

// Current scene (detected by MIDI channel change)
KorgNK.currentScene = 1;

KorgNK.init = function (id, debugging) {
    print("Korg nanoKONTROL Custom: Initializing...");
    KorgNK.id = id;
    print("Korg nanoKONTROL Custom: Ready");
};

KorgNK.shutdown = function () {
    print("Korg nanoKONTROL Custom: Shutting down");
};

// =====================================================
// SCENE DETECTION
// =====================================================
KorgNK.detectScene = function (status) {
    var channel = (status & 0x0F) + 1;
    if (channel >= 1 && channel <= 4) {
        KorgNK.currentScene = channel;
    }
    return KorgNK.currentScene;
};

// =====================================================
// SCENE 2 & 3: STEMS CONTROL
// =====================================================
KorgNK.stemKnob = function (channel, control, value, status, group) {
    var scene = KorgNK.detectScene(status);
    if (scene !== 2 && scene !== 3) return;

    var groupNum = control - 0x0E + 1;
    if (groupNum < 1 || groupNum > 8) return;

    var deckNum, stemNum;
    if (groupNum <= 4) {
        deckNum = (scene === 2) ? 1 : 3;
        stemNum = groupNum;
    } else {
        deckNum = (scene === 2) ? 2 : 4;
        stemNum = groupNum - 4;
    }

    var stemGroup = "[Channel" + deckNum + "_Stem" + stemNum + "]";
    engine.setValue(stemGroup, "volume", value / 127);
};

KorgNK.stemSlider = function (channel, control, value, status, group) {
    var scene = KorgNK.detectScene(status);
    if (scene !== 2 && scene !== 3) return;

    var groupNum = control - 0x02 + 1;
    if (groupNum < 1 || groupNum > 8) return;

    var deckNum, stemNum;
    if (groupNum <= 4) {
        deckNum = (scene === 2) ? 1 : 3;
        stemNum = groupNum;
    } else {
        deckNum = (scene === 2) ? 2 : 4;
        stemNum = groupNum - 4;
    }

    var stemGroup = "[Channel" + deckNum + "_Stem" + stemNum + "]";
    engine.setValue(stemGroup, "volume", value / 127);
};

KorgNK.stemMute = function (channel, control, value, status, group) {
    var scene = KorgNK.detectScene(status);
    if (scene !== 2 && scene !== 3) return;
    if (value !== 127) return;

    var groupNum = control - 0x17 + 1;
    if (groupNum < 1 || groupNum > 8) return;

    var deckNum, stemNum;
    if (groupNum <= 4) {
        deckNum = (scene === 2) ? 1 : 3;
        stemNum = groupNum;
    } else {
        deckNum = (scene === 2) ? 2 : 4;
        stemNum = groupNum - 4;
    }

    var stemGroup = "[Channel" + deckNum + "_Stem" + stemNum + "]";
    engine.setValue(stemGroup, "mute", !engine.getValue(stemGroup, "mute"));
};

// =====================================================
// SCENE 4: SAMPLERS
// =====================================================

KorgNK.samplerRate = function (channel, control, value, status, group) {
    var scene = KorgNK.detectScene(status);
    if (scene !== 4) return;

    var samplerNum = control - 0x0E + 1;
    if (samplerNum < 1 || samplerNum > 8) return;

    // REDUCED SENSITIVITY: ±0.5 range instead of ±1
    // Center (64) = 0, left (0) = -0.5, right (127) = +0.5
    var rate = ((value - 64) / 127) * 0.5;
    engine.setValue("[Sampler" + samplerNum + "]", "rate", rate);
};

KorgNK.samplerVolume = function (channel, control, value, status, group) {
    var scene = KorgNK.detectScene(status);
    if (scene !== 4) return;

    var samplerNum = control - 0x02 + 1;
    if (samplerNum < 1 || samplerNum > 8) return;

    engine.setValue("[Sampler" + samplerNum + "]", "volume", value / 127);
};

KorgNK.samplerPlay = function (channel, control, value, status, group) {
    var scene = KorgNK.detectScene(status);
    if (scene !== 4) return;
    if (value !== 127) return;

    var samplerNum = control - 0x17 + 1;
    if (samplerNum < 1 || samplerNum > 8) return;

    var sampler = "[Sampler" + samplerNum + "]";
    engine.setValue(sampler, "repeat", 1);  // Enable loop
    engine.setValue(sampler, "cue_gotoandplay", 1);
};

KorgNK.samplerStop = function (channel, control, value, status, group) {
    var scene = KorgNK.detectScene(status);
    if (scene !== 4) return;
    if (value !== 127) return;

    var samplerNum = control - 0x21 + 1;
    if (samplerNum < 1 || samplerNum > 8) return;

    engine.setValue("[Sampler" + samplerNum + "]", "stop", 1);
};

// Transport for Scene 4
KorgNK.samplerStopAll = function (channel, control, value, status, group) {
    if (KorgNK.currentScene !== 4) return;
    if (value !== 127) return;

    for (var i = 1; i <= 8; i++) {
        engine.setValue("[Sampler" + i + "]", "stop", 1);
    }
};

KorgNK.samplerEjectAll = function (channel, control, value, status, group) {
    if (KorgNK.currentScene !== 4) return;
    if (value !== 127) return;

    for (var i = 1; i <= 8; i++) {
        engine.setValue("[Sampler" + i + "]", "eject", 1);
    }
};

// =====================================================
// CROSSFADER (Group 9 slider - all scenes)
// =====================================================
KorgNK.crossfader = function (channel, control, value, status, group) {
    engine.setValue("[Master]", "crossfader", (value / 64) - 1);
};
