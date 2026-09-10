import { useMemo, useRef } from 'react';
import { buildRails } from '../lib/browse';
import { SAFETY_META, priceLabel } from '../lib/format';
import { formatDistance } from '../lib/geo';

function PosterCard({ r, onOpen }) {
  const meta = SAFETY_META[r.safetyLevel] || SAFETY_META['gf-menu'];
  return (
    <button className="poster" onClick={() => onOpen(r.id)}>
      <span
        className="poster-top"
        style={{
          background: `linear-gradient(150deg, ${meta.color} 0%, ${meta.color}99 100%)`,
        }}
      >
        <span className="poster-badges">
          {r.spotlight ? (
            <span className="poster-flag poster-flag-hero">★ Local hero</span>
          ) : r.featured ? (
            <span className="poster-flag">★ Featured</span>
          ) : null}
          {r.lateNight ? <span className="poster-flag">🌙 Late</span> : null}
        </span>
        <span className="poster-safety">{meta.short}</span>
      </span>
      <span className="poster-body">
        <span className="poster-name">{r.name}</span>
        <span className="poster-meta">
          {r.neighborhood} · {r.cuisine[0]}
          {' · '}
          {priceLabel(r.priceLevel)}
        </span>
        <span className="poster-tags">
          {r._distMi != null ? (
            <span className="poster-tag poster-tag-dist">
              {formatDistance(r._distMi)}
            </span>
          ) : null}
          {r.dedicatedFryer ? (
            <span className="poster-tag">Dedicated fryer</span>
          ) : null}
          {r.celiacVerified ? (
            <span className="poster-tag">Celiac-verified</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function Rail({ rail, onOpen, onSeeAll }) {
  const scroller = useRef(null);
  const nudge = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="rail">
      <div className="rail-head">
        <div>
          <h2 className="rail-title">{rail.title}</h2>
          {rail.subtitle ? (
            <p className="rail-sub">{rail.subtitle}</p>
          ) : null}
        </div>
        <div className="rail-head-actions">
          {rail.filter ? (
            <button className="rail-seeall" onClick={() => onSeeAll(rail)}>
              See all {rail.spots.length}
            </button>
          ) : null}
          <div className="rail-arrows">
            <button aria-label="Scroll left" onClick={() => nudge(-1)}>
              ‹
            </button>
            <button aria-label="Scroll right" onClick={() => nudge(1)}>
              ›
            </button>
          </div>
        </div>
      </div>
      <div className="rail-track" ref={scroller}>
        {rail.spots.map((r) => (
          <PosterCard key={r.id} r={r} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

export default function BrowseView({
  position,
  hood,
  onOpen,
  onSeeAll,
  onOpenMap,
}) {
  const rails = useMemo(() => buildRails({ position }), [position]);

  return (
    <div className="browse">
      <div className="browse-hero">
        <div>
          <h1 className="browse-hero-title">What are you in the mood for?</h1>
          <p className="browse-hero-sub">
            {hood
              ? `You're set to ${hood}. Browse celiac-safe spots below, or open the map to zoom in on ${hood}.`
              : "Browse celiac-safe spots by vibe, cuisine, or how close they are — then hit the map when you know where you're headed."}
          </p>
        </div>
        <button className="btn browse-map-btn" onClick={onOpenMap}>
          {hood ? `Map of ${hood}` : 'Open the map'}
        </button>
      </div>

      {rails.map((rail) => (
        <Rail key={rail.key} rail={rail} onOpen={onOpen} onSeeAll={onSeeAll} />
      ))}

      <p className="browse-foot muted">
        Always confirm your needs with the restaurant. This guide is a starting
        point, not a medical guarantee.
      </p>
    </div>
  );
}
