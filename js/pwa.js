/* ============================================================
   STRIDES - PWA Module
   Service Worker registration, install prompt, offline support
   ============================================================ */

let deferredPrompt = null;

function initPWA() {
  registerServiceWorker();
  setupInstallPrompt();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch(err => {
        console.warn('Service Worker registration failed:', err);
      });
  }
}

function setupInstallPrompt() {
  // Capture the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallToast();
  });

  // Install button click
  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      hideInstallToast();
    }

    deferredPrompt = null;
  });

  // Dismiss button
  document.getElementById('install-dismiss').addEventListener('click', () => {
    hideInstallToast();
    // Remember dismissal for this session
    sessionStorage.setItem('strides_install_dismissed', 'true');
  });

  // Check if app is already installed
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    hideInstallToast();
    deferredPrompt = null;
  });

  // Show toast on load if not installed and not dismissed
  if (deferredPrompt && !sessionStorage.getItem('strides_install_dismissed')) {
    showInstallToast();
  }
}

function showInstallToast() {
  if (sessionStorage.getItem('strides_install_dismissed')) return;
  const toast = document.getElementById('install-toast');
  // Only show if not already a standalone app
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (window.navigator.standalone === true) return;

  toast.classList.remove('hidden');
}

function hideInstallToast() {
  document.getElementById('install-toast').classList.add('hidden');
}

// Check if running as installed PWA
function isRunningAsPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}
