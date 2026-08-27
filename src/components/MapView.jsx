import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Tooltip,
  useMap,
} from 'react-leaflet';
import { SAFETY_META } from '../lib/format';

const SEATTLE_CENTER = [47.615, -122.33];

// All tiles are Esri ArcGIS Online — free, no API key, consistent look.
const BASEMAPS = {
  dark: {
    label: 'Dark',
    // Esri Dark Gray Canvas — muted Apple-Maps-at-night basemap
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    maxZoom: 19,
    maxNativeZoom: 16,
  },
  satellite: {
    label: 'Satellite',
    // Esri World Imagery, with Esri reference overlays for labels + roads
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, GIS User Community',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
};

const OVERLAYS = {
  dark: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  ],
  satellite: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  ],
};

function loadBasemap() {
  try {
    const v = localStorage.getItem('zgg.basemap');
    if (v && BASEMAPS[v]) return v;
  } catch {
    /* ignore */
  }
  return 'dark';
}

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

    const timers = [0, 80, 200, 400, 800, 1400].map((ms) => setTimeout(fix, ms));

    const ro = new ResizeObserver(fix);
    ro.observe(container);

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

function BasemapToggle({ value, onChange }) {
  return (
    <div className="basemap-toggle">
      {Object.entries(BASEMAPS).map(([key, cfg]) => (
        <button
          key={key}
          className={value === key ? 'on' : ''}
          onClick={() => onChange(key)}
          type="button"
        >
          {cfg.label}
        </button>
      ))}
    </div>
  );
}

// Recenter once when a fresh location fix first arrives.
function FollowUser({ position }) {
  const map = useMap();
  const centered = useRef(false);
  useEffect(() => {
    if (position && !centered.current) {
      centered.current = true;
      map.flyTo([position.lat, position.lng], 14, { duration: 0.8 });
    }
    if (!position) centered.current = false;
  }, [position, map]);
  return null;
}

export default function MapView({
  restaurants,
  selectedId,
  onSelect,
  userPosition,
  locateStatus,
  onLocate,
}) {
  const selected = restaurants.find((r) => r.id === selectedId) || null;
  const [basemap, setBasemap] = useState(loadBasemap);

  function chooseBasemap(key) {
    setBasemap(key);
    try {
      localStorage.setItem('zgg.basemap', key);
    } catch {
      /* ignore */
    }
  }

  const cfg = BASEMAPS[basemap];

  const locateTitle =
    locateStatus === 'denied'
      ? 'Location permission denied — enable it in your browser settings'
      : locateStatus === 'active'
        ? 'Stop showing my location'
        : 'Show my location';

  return (
    <>
      <div className="map-controls">
        <BasemapToggle value={basemap} onChange={chooseBasemap} />
        <button
          type="button"
          className={`locate-btn ${locateStatus === 'active' ? 'on' : ''} ${
            locateStatus === 'locating' ? 'busy' : ''
          }`}
          onClick={onLocate}
          title={locateTitle}
          aria-label={locateTitle}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              fill="currentColor"
              d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 3h-2.06A7 7 0 0 0 13 5.06V3h-2v2.06A7 7 0 0 0 5.06 11H3v2h2.06A7 7 0 0 0 11 18.94V21h2v-2.06A7 7 0 0 0 18.94 13H21v-2Zm-9 6a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"
            />
          </svg>
        </button>
      </div>
      <MapContainer
        center={SEATTLE_CENTER}
        zoom={12}
        scrollWheelZoom
        className="map"
        preferCanvas
      >
        <TileLayer
          key={basemap}
          url={cfg.url}
          attribution={cfg.attribution}
          maxZoom={cfg.maxZoom}
          maxNativeZoom={cfg.maxNativeZoom}
        />
        {OVERLAYS[basemap].map((url) => (
          <TileLayer
            key={url}
            url={url}
            maxZoom={cfg.maxZoom}
            maxNativeZoom={cfg.maxNativeZoom}
          />
        ))}

        <KeepSized />
        <FitToSelection restaurant={selected} />
        <FollowUser position={userPosition} />

        {userPosition ? (
          <>
            <CircleMarker
              center={[userPosition.lat, userPosition.lng]}
              radius={7}
              pathOptions={{
                color: '#fff',
                weight: 2.5,
                fillColor: '#2f8fff',
                fillOpacity: 1,
              }}
            />
            {userPosition.accuracy ? (
              <Circle
                center={[userPosition.lat, userPosition.lng]}
                radius={userPosition.accuracy}
                pathOptions={{
                  color: '#2f8fff',
                  weight: 1,
                  fillColor: '#2f8fff',
                  fillOpacity: 0.1,
                }}
              />
            ) : null}
          </>
        ) : null}

        {restaurants.map((r) => {
          const isSelected = r.id === selectedId;
          return (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lng]}
              radius={isSelected ? 11 : r.featured ? 8 : 7}
              pathOptions={{
                color: r.featured ? '#f5c518' : '#fff',
                weight: isSelected ? 3 : r.featured ? 2.5 : 1.5,
                fillColor: SAFETY_META[r.safetyLevel].color,
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelect(r.id) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <strong>{r.name}</strong>
                {r.featured ? ' ★' : ''}
                <br />
                {SAFETY_META[r.safetyLevel].short}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </>
  );
}
