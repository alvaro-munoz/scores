import { registerSW } from 'virtual:pwa-register';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let needRefresh = $state(false);
let installEvent = $state<InstallPromptEvent | null>(null);

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    needRefresh = true;
  },
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
  });
}

export const pwa = {
  get needRefresh() {
    return needRefresh;
  },
  get canInstall() {
    return installEvent !== null;
  },
  async reload() {
    needRefresh = false;
    await updateServiceWorker(true);
  },
  async install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
  },
};
