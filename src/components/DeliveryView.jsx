import { useEffect, useMemo, useRef, useState } from 'react';
import { SAFETY_META, priceLabel } from '../lib/format';
import { haversineMiles, formatDistance } from '../lib/geo';
import { photoFor } from '../data/cardPhotos';
import { NEIGHBORHOODS, nearestNeighborhood } from '../lib/neighborhoods';
import { deliveryLinks, orderDirect, websiteOrder } from '../lib/order';

const SEEN_KEY = 'zgg.delivery.seen';
const MODE_KEY = 'zgg.delivery.mode';
const AREA_KEY = 'zgg.delivery.area';

const read = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

// A spot is delivery-relevant if it isn't an honorable mention and hasn't opted
// out of ordering. "Curated" additionally drops shared-kitchen "gf-menu" spots —
// you can't watch the kitchen on a delivery order.
function deliverySpots(restaurants, { curated }) {
  return restaurants.filter((r) => {
    if (r.honorableMention || r.order === false) return false;
    if (curated && r.safetyLevel === 'gf-menu') return false;
    return true;
  });
}

const SAFETY_RANK = { dedicated: 0, 'celiac-friendly': 1, 'gf-menu': 2 };

function OrderChoice({ restaurant, onClose }) {
  const links = deliveryLinks(restaurant);
  return (
    <div className="hood-scrim" onClick={onClose} role="dialog" aria-label="Choose a delivery app">
      <div className="hood-modal order-choice" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>Order {restaurant.name}</h2>
        <p className="muted">
          Opens the app's page for this spot. Restate your celiac needs in the
          order notes — delivery kitchens can run differently from the dining room.
        </p>
        <div className="order-choice-apps">
          {links.map((a) => (
            <a
              key={a.key}
              className="btn order-choice-app"
              href={a.url}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
            >
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ r, distMi, onOpen, onOrder }) {
  const meta = SAFETY_META[r.safetyLevel] || SAFETY_META['gf-menu'];
  const [showMenu, setShowMenu] = useState(false);
  const photo = photoFor(r);
  const direct = orderDirect(r);
  const site = websiteOrder(r);
  const links = deliveryLinks(r);

  return (
    <div className="dcard" style={{ borderColor: meta.color }}>
      <button className="dcard-media" onClick={() => onOpen(r.id)}>
        {photo ? <img src={photo} alt="" decoding="async" /> : null}
      </button>
      <div className="dcard-body">
        <div className="dcard-head">
          <button className="dcard-name" onClick={() => onOpen(r.id)}>
            {r.name}
          </button>
          <span
            className="poster-safety"
            style={{ color: meta.color, borderColor: `${meta.color}66` }}
          >
            {meta.short}
          </span>
        </div>
        <p className="dcard-meta">
          {r.neighborhood} · {r.cuisine.join(', ')} · {priceLabel(r.priceLevel)}
          {distMi != null ? ` · ${formatDistance(distMi)}` : ''}
        </p>

        {r.whatToOrder ? (
          <p className="dcard-order">
            <b>What's safe to order:</b> {r.whatToOrder}
          </p>
        ) : null}

        <button
          className="dcard-menu-toggle"
          onClick={() => setShowMenu((s) => !s)}
          aria-expanded={showMenu}
        >
          {showMenu ? 'Hide menus' : 'See the menu'} ▾
        </button>
        {showMenu ? (
          <div className="dcard-menu">
            <p className="muted">Browse the full menu before you order:</p>
            <div className="dcard-menu-links">
              {direct ? (
                <a href={direct.url} target="_blank" rel="noreferrer">
                  {direct.platform === 'their site'
                    ? 'Their site'
                    : direct.platform}{' '}
                  menu
                </a>
              ) : site ? (
                <a href={site} target="_blank" rel="noreferrer">
                  Their site
                </a>
              ) : null}
              {links.map((a) => (
                <a key={a.key} href={a.url} target="_blank" rel="noreferrer">
                  {a.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <button className="btn dcard-order-btn" onClick={() => onOrder(r)}>
          Ready to order?
        </button>
      </div>
    </div>
  );
}

function Intro({ onPick, onClose, canClose, onUseLocation, locating }) {
  return (
    <div className="hood-scrim" onClick={canClose ? onClose : undefined} role="dialog" aria-label="Delivery setup">
      <div className="hood-modal" onClick={(e) => e.stopPropagation()}>
        {canClose ? (
          <button className="detail-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        ) : null}
        <h2>Gluten-free delivery</h2>
        <p className="muted">
          Where are you? We'll sort by what can actually reach you.
        </p>
        <button className="btn hood-loc" onClick={onUseLocation} disabled={locating}>
          {locating ? 'Finding you…' : '📍 Use my location'}
        </button>
        <div className="hood-grid">
          <button className="hood-chip" onClick={() => onPick({ area: null })}>
            <span className="hood-chip-name">Anywhere in the metro</span>
          </button>
          {NEIGHBORHOODS.slice(0, 8).map((n) => (
            <button
              key={n.name}
              className="hood-chip"
              onClick={() => onPick({ area: n.name })}
            >
              <span className="hood-chip-name">{n.name}</span>
              <span className="hood-chip-count">{n.count}</span>
            </button>
          ))}
        </div>

        <h3 className="delivery-intro-h3">How do you want to browse?</h3>
        <div className="delivery-modes">
          <button className="delivery-mode" onClick={() => onPick({ mode: 'curated' })}>
            <span className="delivery-mode-title">✨ Curate it for me</span>
            <span className="delivery-mode-sub">
              Just the dedicated-GF and celiac-friendly spots, safest first.
            </span>
          </button>
          <button className="delivery-mode" onClick={() => onPick({ mode: 'browse' })}>
            <span className="delivery-mode-title">🧭 Let me browse</span>
            <span className="delivery-mode-sub">
              Every spot that delivers, with filters — your call.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryView({ restaurants, position, onOpenRestaurant, onUseLocation, locating }) {
  const [mode, setMode] = useState(() => read(MODE_KEY) || null);
  const [area, setArea] = useState(() => read(AREA_KEY) || null);
  const [showIntro, setShowIntro] = useState(() => read(SEEN_KEY) !== '1');
  const [orderFor, setOrderFor] = useState(null);
  const [safety, setSafety] = useState('all'); // browse-mode filter

  const curated = mode === 'curated';

  const list = useMemo(() => {
    let spots = deliverySpots(restaurants, { curated });
    if (area) spots = spots.filter((r) => r.neighborhood === area);
    if (!curated && safety !== 'all')
      spots = spots.filter((r) => r.safetyLevel === safety);
    const withDist = spots.map((r) => ({
      r,
      d: position ? haversineMiles(position, r) : null,
    }));
    withDist.sort((a, b) => {
      const s = SAFETY_RANK[a.r.safetyLevel] - SAFETY_RANK[b.r.safetyLevel];
      if (curated && s !== 0) return s;
      if (a.d != null && b.d != null) return a.d - b.d;
      return (b.r.featured ? 1 : 0) - (a.r.featured ? 1 : 0) || s;
    });
    return withDist;
  }, [restaurants, curated, area, safety, position]);

  function applyIntro(choice) {
    if ('area' in choice) {
      setArea(choice.area);
      write(AREA_KEY, choice.area);
    }
    if ('mode' in choice) {
      setMode(choice.mode);
      write(MODE_KEY, choice.mode);
      write(SEEN_KEY, '1');
      setShowIntro(false);
    }
  }

  // When a location fix arrives and no area is set yet, snap to the nearest one.
  const prevPos = useRef(false);
  useEffect(() => {
    if (position && !prevPos.current && !area) {
      const near = nearestNeighborhood(position);
      if (near) {
        // eslint-disable-next-line react/set-state-in-effect -- reacting to a geolocation fix
        setArea(near.name);
        write(AREA_KEY, near.name);
      }
    }
    prevPos.current = Boolean(position);
  }, [position, area]);

  return (
    <div className="browse delivery">
      <div className="browse-hero">
        <div>
          <h1 className="browse-hero-title">Gluten-free delivery</h1>
          <p className="browse-hero-sub">
            {curated
              ? 'Dedicated-GF and celiac-friendly spots that deliver — safest first.'
              : 'Every celiac-safe spot that delivers. Check the menu, then order on the app you like.'}
            {area ? ` Showing ${area}.` : ''}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowIntro(true)}>
          {curated ? '✨ Curated' : '🧭 Browsing'} · change
        </button>
      </div>

      {!curated ? (
        <div className="delivery-filterbar">
          {['all', 'dedicated', 'celiac-friendly', 'gf-menu'].map((s) => (
            <button
              key={s}
              className={`chip ${safety === s ? 'chip-on' : ''}`}
              onClick={() => setSafety(s)}
            >
              {s === 'all' ? 'All' : SAFETY_META[s].short}
            </button>
          ))}
        </div>
      ) : null}

      {list.length === 0 ? (
        <p className="browse-foot muted">
          Nothing matches here yet. Try “Anywhere in the metro,” or loosen the
          filter.
        </p>
      ) : (
        <div className="dcard-list">
          {list.map(({ r, d }) => (
            <DeliveryCard
              key={r.id}
              r={r}
              distMi={d}
              onOpen={onOpenRestaurant}
              onOrder={setOrderFor}
            />
          ))}
        </div>
      )}

      <p className="browse-foot muted">
        We link out to DoorDash, Grubhub, and Uber Eats — we can't show live menus
        or take the order here. Always restate your celiac needs in the order
        notes; a delivery kitchen can differ from the dining room.
      </p>

      {showIntro ? (
        <Intro
          canClose={read(SEEN_KEY) === '1'}
          onClose={() => setShowIntro(false)}
          onPick={applyIntro}
          onUseLocation={onUseLocation}
          locating={locating}
        />
      ) : null}
      {orderFor ? (
        <OrderChoice restaurant={orderFor} onClose={() => setOrderFor(null)} />
      ) : null}
    </div>
  );
}
