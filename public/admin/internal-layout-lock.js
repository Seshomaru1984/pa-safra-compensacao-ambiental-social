(() => {
  'use strict';

  const INTERNAL_KEYS = ['about_hero', 'legacy_hero'];

  function removeObsoleteControls() {
    INTERNAL_KEYS.forEach((key) => {
      document.querySelectorAll(`[data-layout-control="${key}"]`).forEach((node) => node.remove());
    });
  }

  function install() {
    removeObsoleteControls();
    const app = document.getElementById('admin-app');
    if (!app) return;
    const observer = new MutationObserver(removeObsoleteControls);
    observer.observe(app, { subtree: true, childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
