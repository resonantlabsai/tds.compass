// /js/badge-kill.js
// Purpose: stop missing zone badge SVG requests (e.g., /assets/badges/D4.svg) without touching other code.
// Load this AFTER your existing scripts on every page that shows badges.

(() => {
  function nukeBadgeImg(scope = document) {
    const imgs = scope.querySelectorAll('img#badge-img, img.badge, img[data-badge]');
    for (const img of imgs) {
      // Hide and remove src to prevent network requests
      img.removeAttribute('src');
      img.style.display = 'none';
      img.setAttribute('alt', '');
    }
  }

  // Run immediately and on DOM ready
  nukeBadgeImg();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", nukeBadgeImg, { once: true });
  }

  // Also run whenever results are updated by tds.js
  document.addEventListener("tds:zone", () => nukeBadgeImg(), false);

  // Defensive: patch the common setter if other code assigns src later
  const set = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')?.set;
  if (set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      set(value) {
        // If this looks like a zone badge path, ignore it
        if (typeof value === 'string' && /\/assets\/badges\/[A-D][1-4]\.svg$/i.test(value)) {
          // no-op
          return;
        }
        return set.call(this, value);
      }
    });
  }
})();
