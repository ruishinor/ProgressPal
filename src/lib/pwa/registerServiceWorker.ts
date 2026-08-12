/**
 * Registers the production service worker that gives ProgressPal real cold-start
 * offline support (Module 17). Registration is a no-op outside a production build
 * and when the browser does not support service workers, so the Vite dev server
 * and jsdom unit tests never register a worker.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) {
    return;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // The application remains fully usable online. ProgressPal makes no
      // offline-readiness claim in the UI, so registration failure only needs
      // to be contained rather than promoted into new global state.
    });
  });
}
