import { NEIGHBORHOODS, REGIONS } from '../lib/neighborhoods';

const TOTAL = NEIGHBORHOODS.reduce((n, h) => n + h.count, 0);

export default function NeighborhoodPicker({
  current,
  onPick,
  onClose,
  onUseLocation,
  locating,
  locateDenied = false,
  dismissable = true,
}) {
  return (
    <div
      className="hood-scrim"
      onClick={dismissable ? onClose : undefined}
      role="dialog"
      aria-label="Choose an area"
    >
      <div className="hood-modal" onClick={(e) => e.stopPropagation()}>
        {dismissable ? (
          <button className="detail-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        ) : null}

        <h2>Where are you eating?</h2>
        <p className="muted">
          Pick an area — the map zooms to the celiac-safe spots there. You can
          switch or go back to the full map anytime.
        </p>

        <button
          className="btn hood-loc"
          onClick={onUseLocation}
          disabled={locating}
        >
          {locating ? 'Finding you…' : '📍 Use my location'}
        </button>
        {locateDenied ? (
          <p className="rf-note rf-note-warn">
            Location is blocked — pick an area below, or enable location in your
            browser settings.
          </p>
        ) : null}

        <button
          className={`hood-chip hood-chip-all ${!current ? 'on' : ''}`}
          onClick={() => onPick(null)}
        >
          <span className="hood-chip-name">All spots</span>
          <span className="hood-chip-count">{TOTAL}</span>
        </button>

        {REGIONS.map((group) => (
          <div key={group.region} className="hood-region">
            <h3 className="hood-region-name">{group.region}</h3>
            <div className="hood-grid">
              {group.hoods.map((n) => (
                <button
                  key={n.name}
                  className={`hood-chip ${current === n.name ? 'on' : ''}`}
                  onClick={() => onPick(n.name)}
                >
                  <span className="hood-chip-name">{n.name}</span>
                  <span className="hood-chip-count">{n.count}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
