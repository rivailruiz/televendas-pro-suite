// Utility to safely navigate in GitHub Pages environment
export const clearRedirectLoop = () => {
  sessionStorage.removeItem('spa-redirect-processed');
  sessionStorage.removeItem('redirect-count');
};

// Call this when app initializes to ensure clean state
export const initNavigation = () => {
  // Clear any stuck redirect states
  window.addEventListener('load', () => {
    // Clear redirect flags after page loads successfully
    setTimeout(() => {
      clearRedirectLoop();
    }, 1000);
  });

  // Clear on popstate (back/forward button)
  window.addEventListener('popstate', () => {
    clearRedirectLoop();
  });
};
