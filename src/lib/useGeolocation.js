import { useCallback, useEffect, useRef, useState } from 'react';

// Wraps navigator.geolocation.watchPosition. Only works over https / localhost.
export function useGeolocation() {
  const [position, setPosition] = useState(null); // { lat, lng, accuracy }
  const [status, setStatus] = useState('idle'); // idle | locating | active | denied | error
  const watchId = useRef(null);

  const stop = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setStatus('idle');
    setPosition(null);
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      return;
    }
    if (watchId.current != null) return;
    setStatus('locating');
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('active');
      },
      (err) => {
        setStatus(err.code === 1 ? 'denied' : 'error');
        if (watchId.current != null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }, []);

  const toggle = useCallback(() => {
    if (watchId.current != null) stop();
    else start();
  }, [start, stop]);

  useEffect(
    () => () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    },
    []
  );

  return { position, status, start, stop, toggle };
}
