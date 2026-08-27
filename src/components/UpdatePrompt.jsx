import { useRegisterSW } from 'virtual:pwa-register/react';

// Shows a small bar when a new deploy is available so people don't get stuck on
// a stale cached build. Clicking Reload activates the new service worker and
// refreshes.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-toast" role="status">
      <span>A new version is ready.</span>
      <button className="btn" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
      <button
        className="update-toast-x"
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
