// Attempt to open the EpochLag app via its custom URL scheme.
//
// How it works:
//   1. We navigate to the epochlag:// deep link.
//   2. If the app IS installed: the OS hands off to the app, the browser tab
//      goes to the background → document fires "visibilitychange" (hidden) or
//      "pagehide" (iOS Safari). We cancel the fallback timer.
//   3. If the app is NOT installed: the scheme silently fails, the tab stays
//      visible, and the timer fires after TIMEOUT_MS → onFallback() runs.
//
// Coordination point with mobile: deep-link URL shape must match exactly what
// the mobile team declared in their handler (epochlag://reply/<type>/<code>).
// Lock this before shipping.

const TIMEOUT_MS = 1500;

export function tryOpenApp(deepLink: string, onFallback: () => void): void {
  let settled = false;

  const settle = (open: boolean) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    if (!open) onFallback();
  };

  const onVisibilityChange = () => {
    if (document.hidden) settle(true);
  };

  // pagehide fires on iOS Safari when another app takes over
  const onPageHide = () => settle(true);

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);

  const timer = setTimeout(() => settle(false), TIMEOUT_MS);

  window.location.href = deepLink;
}
