import { useEffect, useRef } from 'react';
import { SAFETY_META, priceLabel } from '../lib/format';
import { getReviews, summarize } from '../lib/reviews';

function Stars({ value }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
    </span>
  );
}

export default function RestaurantList({ restaurants, selectedId, onSelect, reviewsVersion }) {
  const refs = useRef({});

  useEffect(() => {
    const el = refs.current[selectedId];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  if (!restaurants.length) {
    return (
      <p className="empty">
        No spots match those filters. Try loosening the safety level or clearing
        cuisines.
      </p>
    );
  }

  return (
    <ul className="rlist" data-rv={reviewsVersion}>
      {restaurants.map((r) => {
        const meta = SAFETY_META[r.safetyLevel];
        const stats = summarize(getReviews(r.id));
        return (
          <li key={r.id}>
            <button
              ref={(el) => (refs.current[r.id] = el)}
              className={`rcard ${r.id === selectedId ? 'rcard-on' : ''}`}
              onClick={() => onSelect(r.id)}
            >
              <span className="rcard-bar" style={{ background: meta.color }} />
              <span className="rcard-body">
                <span className="rcard-top">
                  <span className="rcard-name">{r.name}</span>
                  <span className="rcard-price">{priceLabel(r.priceLevel)}</span>
                </span>
                <span className="rcard-meta">
                  {r.neighborhood} · {r.cuisine.join(', ')}
                </span>
                <span className="rcard-tags">
                  <span className="tag" style={{ borderColor: meta.color, color: meta.color }}>
                    {meta.short}
                  </span>
                  {r.dedicatedFryer ? <span className="tag">Dedicated fryer</span> : null}
                  {r.celiacVerified ? <span className="tag">Celiac-verified</span> : null}
                </span>
                {stats ? (
                  <span className="rcard-reviews">
                    <Stars value={stats.avgRating} /> {stats.avgRating} ({stats.count})
                    {stats.glutenedCount > 0 ? (
                      <span className="warn">
                        {' '}
                        · {stats.glutenedCount} glutening reported
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
