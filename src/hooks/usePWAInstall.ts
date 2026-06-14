// PWA install is now handled globally by PWAInstallBanner component
// This hook is kept for backwards compatibility but is no longer needed
export function usePWAInstall() {
  return { showPrompt: false, triggerPrompt: () => {}, install: async () => {} };
}
