import { SAFETY_META } from '../lib/format';

const LEVELS = ['dedicated', 'celiac-friendly', 'gf-menu', 'honorable'];

export default function SafetyKey({ onClose }) {
  return (
    <div
      className="hood-scrim"
      onClick={onClose}
      role="dialog"
      aria-label="What the colors mean"
    >
      <div className="hood-modal safety-key" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>What the colors mean</h2>
        <p className="muted">
          Every dot on the map, card border, and badge is colored by how safe the
          kitchen is for celiac disease — safest at the top.
        </p>
        <ul className="safety-key-list">
          {LEVELS.map((l) => {
            const m = SAFETY_META[l];
            return (
              <li key={l}>
                <span
                  className="safety-key-badge"
                  style={{ color: m.color, borderColor: `${m.color}88` }}
                >
                  {m.short}
                </span>
                <div>
                  <strong>{m.label}</strong>
                  <p>{m.blurb}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="muted safety-key-foot-note">
          That badge on each card, the dot on the map, and the card's border are
          all the same color.
        </p>
        <p className="disclaimer">
          It's a starting point, not a medical guarantee. Protocols, menus, and
          staff change — always confirm your needs with the restaurant.
        </p>
      </div>
    </div>
  );
}

// Small inline trigger — a "?" chip that opens the key.
export function SafetyKeyButton({ onClick, label = 'What do the colors mean?' }) {
  return (
    <button type="button" className="safety-key-btn" onClick={onClick}>
      <span aria-hidden>◍</span> {label}
    </button>
  );
}
