import { SAFETY_META } from '../lib/format';
import { CUISINES } from '../data/restaurants';

const SAFETY_ORDER = ['dedicated', 'celiac-friendly', 'gf-menu'];

export default function Filters({ filters, setFilters, count, total }) {
  function toggleSafety(level) {
    setFilters((f) => {
      const next = new Set(f.safety);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return { ...f, safety: next };
    });
  }

  function toggleCuisine(c) {
    setFilters((f) => {
      const next = new Set(f.cuisine);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return { ...f, cuisine: next };
    });
  }

  const active =
    filters.safety.size ||
    filters.cuisine.size ||
    filters.dedicatedFryer ||
    filters.celiacVerified ||
    filters.maxPrice < 4;

  return (
    <div className="filters">
      <div className="filters-head">
        <span className="result-count">
          {count} of {total} spots
        </span>
        {active ? (
          <button
            className="link-btn"
            onClick={() =>
              setFilters({
                safety: new Set(),
                cuisine: new Set(),
                dedicatedFryer: false,
                celiacVerified: false,
                maxPrice: 4,
              })
            }
          >
            Clear all
          </button>
        ) : null}
      </div>

      <fieldset>
        <legend>Safety level</legend>
        {SAFETY_ORDER.map((level) => (
          <label key={level} className="check">
            <input
              type="checkbox"
              checked={filters.safety.has(level)}
              onChange={() => toggleSafety(level)}
            />
            <span
              className="dot"
              style={{ background: SAFETY_META[level].color }}
            />
            {SAFETY_META[level].label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Must have</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.dedicatedFryer}
            onChange={(e) =>
              setFilters((f) => ({ ...f, dedicatedFryer: e.target.checked }))
            }
          />
          Dedicated gluten-free fryer
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.celiacVerified}
            onChange={(e) =>
              setFilters((f) => ({ ...f, celiacVerified: e.target.checked }))
            }
          />
          Community celiac-verified
        </label>
      </fieldset>

      <fieldset>
        <legend>Max price: {'$'.repeat(filters.maxPrice)}</legend>
        <input
          type="range"
          min="1"
          max="4"
          value={filters.maxPrice}
          onChange={(e) =>
            setFilters((f) => ({ ...f, maxPrice: Number(e.target.value) }))
          }
        />
      </fieldset>

      <fieldset>
        <legend>Cuisine</legend>
        <div className="chips">
          {CUISINES.map((c) => (
            <button
              key={c}
              className={`chip ${filters.cuisine.has(c) ? 'chip-on' : ''}`}
              onClick={() => toggleCuisine(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
