/**
 * main.js — จุดเริ่มต้น: ผูกปุ่มต่าง ๆ เข้ากับตัวเกม
 */
(function (BW) {
    const UI = BW.UI;
    const $ = (id) => document.getElementById(id);

    const game = new BW.Game($('gameCanvas'), {
        onHud: UI.updateHud,
        onEnd: UI.showResult
    });

    BW.game = game;   // เปิดไว้ให้ดีบัก/ทดสอบผ่านคอนโซล

    // ค่าเริ่มต้นของ HUD (เหรียญ/คะแนนสูงสุดที่บันทึกไว้)
    UI.updateHud(game.snapshot());
    UI.fit();
    window.addEventListener('resize', UI.fit);

    // ชื่อผู้เล่นที่เคยใช้
    UI.el.input.value = BW.Storage.get('username', '');

    /* ---------- หน้าแรก (หน้าปก) ---------- */
    let loggedIn = false;

    function leaveCover() {
        BW.Sound.init();
        if (loggedIn) {
            UI.show('start');
        } else {
            UI.show('login');
            UI.el.input.focus();
        }
    }

    $('screen-home').addEventListener('click', leaveCover);
    UI.show('home');

    /* ---------- Login ---------- */
    function login() {
        loggedIn = true;
        BW.Sound.init();
        const name = UI.el.input.value.trim() || 'Player';
        BW.Storage.set('username', name);
        UI.setUser(name);
        UI.show('start');
    }

    $('btn-login').addEventListener('click', login);
    UI.el.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') login();
    });

    /* ---------- เริ่ม / เล่นใหม่ ---------- */
    function play() {
        BW.Sound.init();
        UI.show(null);
        game.start();
    }

    $('btn-play').addEventListener('click', play);
    $('btn-again').addEventListener('click', play);

    /* ---------- Pause / Resume / End ---------- */
    function togglePause() {
        BW.Sound.init();
        if (game.state === 'playing') {
            game.pause();
            UI.show('pause');
        } else if (game.state === 'paused') {
            game.resume();
            UI.show(null);
        }
    }

    $('btn-pause').addEventListener('click', togglePause);
    $('btn-resume').addEventListener('click', togglePause);
    $('btn-end').addEventListener('click', () => {
        // จบเกมจากหน้า Pause: ต้องกลับเป็นสถานะ playing ก่อน เพื่อให้ end() ทำงาน
        game.state = 'playing';
        game.end(false, 'End Game');
    });

    document.addEventListener('keydown', (e) => {
        if (e.target === UI.el.input) return;
        if (!$('screen-home').classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ')) {
            leaveCover();
            return;
        }
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
    });

    // สลับแท็บ -> หยุดเกมอัตโนมัติ
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === 'playing') {
            game.pause();
            UI.show('pause');
        }
    });

    /* ---------- กลับหน้าแรก ---------- */
    function goHome() {
        game.quit();
        UI.show('home');
    }

    $('btn-home-pause').addEventListener('click', goHome);
    $('btn-home-over').addEventListener('click', goHome);
    $('btn-switch').addEventListener('click', () => {
        UI.show('login');
        UI.el.input.focus();
    });

    /* ---------- เสียง ---------- */
    $('btn-sound').addEventListener('click', () => {
        BW.Sound.init();
        UI.setSoundIcon(BW.Sound.toggle());
    });
})(window.BW);
