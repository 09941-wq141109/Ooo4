/**
 * ui.js — จัดการ DOM ทั้งหมด: HUD, หน้าจอซ้อน (login/start/pause/over), การย่อขยายหน้าจอ
 */
window.BW = window.BW || {};

BW.UI = (function () {
    const $ = (id) => document.getElementById(id);

    const el = {
        wrapper: $('game-wrapper'),
        level: $('top-level'),
        coins: $('top-coins'),
        stars: $('top-stars'),
        high: $('top-high'),
        time: $('time-display'),
        score: $('score-display'),
        sound: $('btn-sound'),
        user: $('user-display'),
        welcome: $('welcome-name'),
        input: $('username-input'),
        resultIcon: $('result-icon'),
        resultTitle: $('result-title'),
        resultSub: $('result-subtitle'),
        resultScore: $('final-score'),
        resultRecord: $('result-record')
    };

    const screens = {
        home: $('screen-home'),
        login: $('screen-login'),
        start: $('screen-start'),
        pause: $('screen-pause'),
        over: $('screen-over')
    };

    const cache = {};

    function fmt(n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function setText(key, node, value) {
        if (cache[key] !== value) {
            cache[key] = value;
            node.textContent = value;
        }
    }

    function updateHud(s) {
        setText('level', el.level, s.level);
        setText('coins', el.coins, fmt(s.coins));
        setText('stars', el.stars, s.pops + '/' + s.goal);
        setText('high', el.high, fmt(s.high));
        setText('time', el.time, s.time);
        setText('score', el.score, fmt(s.score));
        el.time.classList.toggle('low', s.time <= 10 && s.time > 0);
    }

    /** แสดงหน้าจอซ้อนหนึ่งหน้า (หรือ null = ซ่อนทั้งหมด) */
    function show(name) {
        // ปุ่มที่เพิ่งกดจะถูกซ่อน: ปล่อยโฟกัสไม่ให้ Enter/Space ไปกดปุ่มที่มองไม่เห็นซ้ำ
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        Object.keys(screens).forEach((key) => {
            screens[key].classList.toggle('hidden', key !== name);
        });
    }

    function setUser(name) {
        el.welcome.textContent = name;
        el.user.textContent = '👤 ' + name;
        el.user.classList.remove('hidden');
    }

    function setSoundIcon(on) {
        el.sound.textContent = on ? '🔊' : '🔇';
    }

    function showResult(res) {
        if (res.win) {
            el.resultIcon.textContent = '🐿️👑';
            el.resultTitle.textContent = 'You Win!';
            el.resultTitle.style.color = '#6b3917';
        } else {
            el.resultIcon.textContent = '🐿️💧';
            el.resultTitle.textContent = 'Game Over!';
            el.resultTitle.style.color = '#d9381e';
        }
        el.resultSub.textContent = res.text;
        el.resultScore.textContent = fmt(res.score);
        el.resultRecord.textContent = res.record ? '🏆 New High Score!' : '';
        show('over');
    }

    /** ย่อเกมให้พอดีหน้าจอมือถือ/หน้าต่างเล็ก */
    function fit() {
        const scale = Math.min(1, (window.innerWidth - 16) / 812, (window.innerHeight - 16) / 532);
        el.wrapper.style.transform = 'scale(' + scale + ')';
    }

    return {
        el: el,
        show: show,
        updateHud: updateHud,
        setUser: setUser,
        setSoundIcon: setSoundIcon,
        showResult: showResult,
        fit: fit
    };
})();
