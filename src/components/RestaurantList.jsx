import { useEffect, useRef } from 'react';
import { SAFETY_META, priceLabel } from '../lib/format';
import { getReviews, summarize } from '../lib/reviews';
import { getVisits } from '../lib/profile';
import { haversineMiles, formatDistance } from '../lib/geo';
import SuggestSpot from './SuggestSpot';

function Stars({ value }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
    </span>
  );
}

export default function RestaurantList({
  restaurants,
  selectedId,
  onSelect,
  reviewsVersion,
  profileVersion,
  userPosition,
}) {
  const refs = useRef({});

  useEffect(() => {
    const el = refs.current[selectedId];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  if (!restaurants.length) {
    return (
      <div className="empty">
        <p>
          No spots match those filters. Try loosening the safety level or
          clearing cuisines.
        </p>
        <p className="muted">
          Know a celiac-safe spot we don’t list?{' '}
          <SuggestSpot label="Suggest it" />
        </p>
      </div>
    );
  }

  return (
    <ul className="rlist" data-rv={`${reviewsVersion}-${profileVersion}`}>
      {restaurants.map((r) => {
        const meta = SAFETY_META[r.safetyLevel];
        const stats = summarize(getReviews(r.id));
        const visitCount = getVisits(r.id).length;
        const distMi = userPosition ? haversineMiles(userPosition, r) : null;
        return (
          <li key={r.id}>
            <button
              ref={(el) => (refs.current[r.id] = el)}
              className={`rcard ${r.id === selectedId ? 'rcard-on' : ''} ${
                r.spotlight ? 'rcard-spotlight' : ''
              } ${r.honorableMention ? 'rcard-honorable' : ''}`}
              onClick={() => onSelect(r.id)}
            >
              <span className="rcard-bar" style={{ background: meta.color }} />
              <span className="rcard-body">
                {r.spotlight ? (
                  <span className="spotlight-ribbon">★ Local hero — the GF community's bar</span>
                ) : null}
                <span className="rcard-top">
                  <span className="rcard-name">
                    {r.featured && !r.spotlight ? <span className="star">★ </span> : null}
                    {r.name}
                  </span>
                  <span className="rcard-price">{priceLabel(r.priceLevel)}</span>
                </span>
                <span className="rcard-meta">
                  {r.neighborhood} · {r.cuisine.join(', ')}
                  {distMi != null ? ` · ${formatDistance(distMi)}` : ''}
                </span>
                <span className="rcard-tags">
                  <span className="tag" style={{ borderColor: meta.color, color: meta.color }}>
                    {meta.short}
                  </span>
                  {r.dedicatedFryer ? <span className="tag">Dedicated fryer</span> : null}
                  {r.celiacVerified ? <span className="tag">Celiac-verified</span> : null}
                  {visitCount > 0 ? (
                    <span className="tag tag-visit">✓ {visitCount}× visited</span>
                  ) : null}
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
