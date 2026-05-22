/* ============================================================
   InvestIQ - PWA Module
   ============================================================ */

let deferredPrompt = null;

function initPWA() {
  registerServiceWorker();
  setupInstallPrompt();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(r => console.log('SW registered:', r.scope)).catch(e => console.warn('SW failed:', e));
  }
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; showInstallToast(); });
  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') hideInstallToast();
    deferredPrompt = null;
  });
  document.getElementById('install-dismiss').addEventListener('click', () => { hideInstallToast(); sessionStorage.setItem('investiq_install_dismissed', 'true'); });
  window.addEventListener('appinstalled', () => { hideInstallToast(); deferredPrompt = null; });
  if (deferredPrompt && !sessionStorage.getItem('investiq_install_dismissed')) showInstallToast();
}

function showInstallToast() {
  if (sessionStorage.getItem('investiq_install_dismissed')) return;
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;
  document.getElementById('install-toast').classList.remove('hidden');
}

function hideInstallToast() { document.getElementById('install-toast').classList.add('hidden'); }
function isRunningAsPWA() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
