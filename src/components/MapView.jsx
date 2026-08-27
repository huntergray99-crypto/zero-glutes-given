import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { SAFETY_META } from '../lib/format';

const SEATTLE_CENTER = [47.615, -122.33];

function FitToSelection({ restaurant }) {
  const map = useMap();
  useEffect(() => {
    if (restaurant) {
      map.flyTo([restaurant.lat, restaurant.lng], 15, { duration: 0.6 });
    }
  }, [restaurant, map]);
  return null;
}

// Leaflet needs its size recomputed once the flex layout has settled and
// whenever the container becomes visible (e.g. the mobile list/map toggle,
// which flips the parent between display:none and block).
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize({ animate: false });
    const container = map.getContainer();

    // Recompute a few times right after mount while the flex layout settles
    // (and, in dev, while the bundled CSS is injected after first paint).
    const timers = [0, 80, 200, 400, 800, 1400].map((ms) => setTimeout(fix, ms));

    const ro = new ResizeObserver(fix);
    ro.observe(container);

    // fires when the map scrolls back into view after being display:none
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) fix();
      },
      { threshold: 0.01 }
    );
    io.observe(container);

    window.addEventListener('resize', fix);
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('resize', fix);
    };
  }, [map]);
  return null;
}

export default function MapView({ restaurants, selectedId, onSelect }) {
  const selected = restaurants.find((r) => r.id === selectedId) || null;

  return (
    <MapContainer
      center={SEATTLE_CENTER}
      zoom={12}
      scrollWheelZoom
      className="map"
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <KeepSized />
      <FitToSelection restaurant={selected} />
      {restaurants.map((r) => {
        const isSelected = r.id === selectedId;
        return (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={isSelected ? 11 : 7}
            pathOptions={{
              color: '#fff',
              weight: isSelected ? 3 : 1.5,
              fillColor: SAFETY_META[r.safetyLevel].color,
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelect(r.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <strong>{r.name}</strong>
              <br />
              {SAFETY_META[r.safetyLevel].short}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
