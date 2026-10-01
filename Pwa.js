/**
 * pwa.js — ลงทะเบียน Service Worker และปุ่ม "Install App"
 * ทำงานเฉพาะเมื่อเปิดผ่าน http(s) — เปิดจากไฟล์ตรง ๆ (file://) เกมยังเล่นได้ปกติ
 */
(function () {
    const installBtn = document.getElementById('btn-install');
    let deferredPrompt = null;

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
        });
    }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.classList.remove('hidden');
    });

    if (installBtn) {
        installBtn.addEventListener('click', function () {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function () {
                deferredPrompt = null;
                installBtn.classList.add('hidden');
            });
        });
    }

    window.addEventListener('appinstalled', function () {
        if (installBtn) installBtn.classList.add('hidden');
    });
})();
