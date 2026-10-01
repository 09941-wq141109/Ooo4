/**
 * storage.js — เก็บชื่อผู้เล่น / คะแนนสูงสุด / เหรียญ ไว้ใน localStorage
 * ครอบด้วย try/catch เผื่อเบราว์เซอร์บล็อกการเก็บข้อมูล (เกมยังเล่นได้ตามปกติ)
 */
window.BW = window.BW || {};

(function (BW) {
    const PREFIX = 'bubblewoods:';

    BW.Storage = {
        get: function (key, fallback) {
            try {
                const v = window.localStorage.getItem(PREFIX + key);
                return v === null ? fallback : v;
            } catch (e) {
                return fallback;
            }
        },

        set: function (key, value) {
            try {
                window.localStorage.setItem(PREFIX + key, String(value));
            } catch (e) { /* ignore */ }
        },

        getNumber: function (key, fallback) {
            const n = Number(this.get(key, fallback));
            return isFinite(n) ? n : fallback;
        }
    };
})(window.BW);
