/**
 * sound.js — เสียงเอฟเฟกต์และดนตรีประกอบด้วย Web Audio API (ไม่ต้องมีไฟล์เสียง)
 */
window.BW = window.BW || {};

BW.Sound = (function () {
    let ctx = null;
    let enabled = true;
    let bgmWanted = false;
    let bgmTimer = null;
    let noteIndex = 0;

    const NOTES = [
        261.63, 329.63, 392.00, 523.25, 392.00, 329.63,
        293.66, 349.23, 440.00, 587.33, 440.00, 349.23,
        329.63, 392.00, 493.88, 659.25, 493.88, 392.00
    ];

    /** ต้องเรียกหลังผู้ใช้กด/แตะ อย่างน้อยหนึ่งครั้ง (ข้อกำหนดของเบราว์เซอร์) */
    function init() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ctx = new AC();
        }
        if (ctx.state === 'suspended') ctx.resume();
    }

    function tone(opts) {
        if (!enabled || !ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = opts.type;
        osc.frequency.setValueAtTime(opts.from, t);
        if (opts.to && opts.to !== opts.from) {
            osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur);
        }

        gain.gain.setValueAtTime(opts.vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + opts.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + opts.dur);
    }

    function bgmStep() {
        tone({ type: 'triangle', from: NOTES[noteIndex], dur: 0.25, vol: 0.04 });
        noteIndex = (noteIndex + 1) % NOTES.length;
    }

    function startBGM() {
        bgmWanted = true;
        stopTimer();
        if (enabled) bgmTimer = setInterval(bgmStep, 220);
    }

    function stopBGM() {
        bgmWanted = false;
        stopTimer();
    }

    function stopTimer() {
        if (bgmTimer) {
            clearInterval(bgmTimer);
            bgmTimer = null;
        }
    }

    function toggle() {
        enabled = !enabled;
        if (!enabled) {
            stopTimer();
        } else if (bgmWanted) {
            startBGM();
        }
        return enabled;
    }

    return {
        init: init,
        toggle: toggle,
        isEnabled: function () { return enabled; },
        startBGM: startBGM,
        stopBGM: stopBGM,
        shoot:  function () { tone({ type: 'sine',     from: 300, to: 800, dur: 0.12, vol: 0.3 }); },
        pop:    function () { tone({ type: 'triangle', from: 600, to: 120, dur: 0.15, vol: 0.4 }); },
        bounce: function () { tone({ type: 'sine',     from: 400, to: 300, dur: 0.08, vol: 0.2 }); },
        snap:   function () { tone({ type: 'sine',     from: 220, to: 110, dur: 0.06, vol: 0.2 }); }
    };
})();
