import { useEffect, useMemo, useRef, useState } from 'react';
import { SAFETY_META, priceLabel } from '../lib/format';
import { haversineMiles, formatDistance } from '../lib/geo';
import { photoFor, photoCredit } from '../data/cardPhotos';
import { NEIGHBORHOODS, nearestNeighborhood } from '../lib/neighborhoods';
import { deliveryLinks, menuLink, pickupOnly } from '../lib/order';
import MapView from './MapView';
import ErrorBoundary from './ErrorBoundary';
import { SafetyKeyButton } from './SafetyKey';

const AREA_KEY = 'zgg.delivery.area';
const SEEN_KEY = 'zgg.delivery.seen';

const read = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    if (v == null) localStorage.setItem(k, '');
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

const SAFETY_RANK = { dedicated: 0, 'celiac-friendly': 1, 'gf-menu': 2 };

function deliverySpots(restaurants) {
  return restaurants.filter((r) => !r.honorableMention && r.order !== false);
}

function OrderChoice({ restaurant, onClose }) {
  const apps = deliveryLinks(restaurant);
  const menu = menuLink(restaurant);
  const noApps = pickupOnly(restaurant) || apps.length === 0;
  return (
    <div className="hood-scrim" onClick={onClose} role="dialog" aria-label="Choose a delivery app">
      <div className="hood-modal order-choice" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>Order {restaurant.name}</h2>
        {noApps ? (
          <>
            <p className="muted">
              {restaurant.name} doesn't take orders through the delivery apps.
              Order or reserve on their own site.
            </p>
            {menu ? (
              <div className="order-choice-apps">
                <a
                  className="btn order-choice-app"
                  href={menu.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                >
                  {menu.label === 'Full menu' ? 'Their site' : menu.label}
                </a>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="muted">
              Opens {restaurant.name}'s page on the app you pick. Restate your
              celiac needs in the order notes — a delivery kitchen can run
              differently from the dining room.
            </p>
            <div className="order-choice-apps">
              {apps.map((a) => (
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
          </>
        )}
      </div>
    </div>
  );
}

function DeliveryCard({ r, distMi, selected, onOpen, onSelect, onOrder }) {
  const meta = SAFETY_META[r.safetyLevel] || SAFETY_META['gf-menu'];
  const photo = photoFor(r);
  const credit = photoCredit(r);
  const menu = menuLink(r);
  const apps = deliveryLinks(r);
  const noApps = pickupOnly(r) || apps.length === 0;

  return (
    <div
      className={`dcard ${selected ? 'dcard-on' : ''}`}
      style={{ borderColor: selected ? undefined : meta.color }}
      onMouseEnter={() => onSelect(r.id)}
    >
      <button className="dcard-media" onClick={() => onOpen(r.id)}>
        {photo ? <img src={photo} alt="" decoding="async" /> : null}
        {credit ? (
          <span
            className="photo-credit photo-credit-sm"
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              window.open(credit.yelpUrl, '_blank', 'noopener,noreferrer');
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.stopPropagation();
              e.preventDefault();
              window.open(credit.yelpUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            Yelp
          </span>
        ) : null}
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
          {distMi != null ? ` · ${formatDistance(distMi)} away` : ''}
        </p>

        {r.whatToOrder ? (
          <p className="dcard-order">
            <b>What's safe to order:</b> {r.whatToOrder}
          </p>
        ) : null}

        <div className="dcard-actions">
          {menu ? (
            <a
              className="btn btn-ghost dcard-menu-btn"
              href={menu.url}
              target="_blank"
              rel="noreferrer"
            >
              📋 {menu.label}
            </a>
          ) : null}
          {!noApps ? (
            <span className="dcard-apps">
              on {apps.map((a) => a.label).join(' · ')}
            </span>
          ) : (
            <span className="dcard-apps dcard-apps-none">order direct only</span>
          )}
        </div>

        <button className="btn dcard-order-btn" onClick={() => onOrder(r)}>
          {noApps ? 'How to order' : 'Ready to order?'}
        </button>
      </div>
    </div>
  );
}

function CityPicker({ onPick, onClose, canClose, onUseLocation, locating }) {
  return (
    <div className="hood-scrim" onClick={canClose ? onClose : undefined} role="dialog" aria-label="Delivery area">
      <div className="hood-modal" onClick={(e) => e.stopPropagation()}>
        {canClose ? (
          <button className="detail-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        ) : null}
        <h2>Gluten-free delivery</h2>
        <p className="muted">
          Where are you? We'll show the celiac-safe spots that deliver near you,
          on the map and in a list.
        </p>
        <button className="btn hood-loc" onClick={onUseLocation} disabled={locating}>
          {locating ? 'Finding you…' : '📍 Use my location'}
        </button>
        <div className="hood-grid">
          <button className="hood-chip hood-chip-all" onClick={() => onPick(null)}>
            <span className="hood-chip-name">Show me everywhere</span>
          </button>
          {NEIGHBORHOODS.map((n) => (
            <button
              key={n.name}
              className="hood-chip"
              onClick={() => onPick(n.name)}
            >
              <span className="hood-chip-name">{n.name}</span>
              <span className="hood-chip-count">{n.count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DeliveryView({
  restaurants,
  position,
  locateStatus,
  onLocate,
  onUseLocation,
  onOpenRestaurant,
  onExplainColors,
}) {
  const all = useMemo(() => deliverySpots(restaurants), [restaurants]);
  const [area, setArea] = useState(() => read(AREA_KEY) || null);
  const [chosen, setChosen] = useState(() => read(SEEN_KEY) === '1');
  const [showPicker, setShowPicker] = useState(() => read(SEEN_KEY) !== '1');
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [orderFor, setOrderFor] = useState(null);
  const [fitRequest, setFitRequest] = useState(null);
  const pendingGps = useRef(false);

  const list = useMemo(() => {
    let spots = area ? all.filter((r) => r.neighborhood === area) : all;
    const rows = spots.map((r) => ({
      r,
      d: position ? haversineMiles(position, r) : null,
    }));
    rows.sort((a, b) => {
      if (a.d != null && b.d != null) return a.d - b.d;
      return (
        SAFETY_RANK[a.r.safetyLevel] - SAFETY_RANK[b.r.safetyLevel] ||
        (b.r.featured ? 1 : 0) - (a.r.featured ? 1 : 0)
      );
    });
    return rows;
  }, [all, area, position]);

  function chooseArea(name) {
    setArea(name);
    write(AREA_KEY, name);
    write(SEEN_KEY, '1');
    setChosen(true);
    setShowPicker(false);
    setMobileView('list');
    setFitRequest({
      ids: (name ? all.filter((r) => r.neighborhood === name) : all).map((r) => r.id),
      n: Date.now(),
    });
  }

  function useLocation() {
    pendingGps.current = true;
    onUseLocation?.();
  }

  // A location fix arrived after "use my location" — snap to nearest area.
  useEffect(() => {
    if (!pendingGps.current || !position) return;
    pendingGps.current = false;
    const near = nearestNeighborhood(position);
    chooseArea(near ? near.name : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  // Frame the area's spots on the map whenever the chosen area changes.
  useEffect(() => {
    if (!chosen) return;
    setFitRequest({
      ids: (area ? all.filter((r) => r.neighborhood === area) : all).map((r) => r.id),
      n: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, chosen]);

  if (!chosen && showPicker) {
    return (
      <div className="browse delivery">
        <CityPicker
          canClose={false}
          onClose={() => {}}
          onPick={chooseArea}
          onUseLocation={useLocation}
          locating={locateStatus === 'locating'}
        />
      </div>
    );
  }

  return (
    <>
      <div className="hood-bar">
        <button className="hood-bar-btn" onClick={() => setShowPicker(true)}>
          <span className="hood-pin">📍</span>
          <span className="hood-bar-name">{area || 'Everywhere'}</span>
          <span className="hood-bar-count">
            {list.length} deliver{list.length === 1 ? 's' : ''}
          </span>
          <span className="hood-bar-caret">▾</span>
        </button>
        {area ? (
          <button className="hood-bar-clear" onClick={() => chooseArea(null)}>
            Everywhere
          </button>
        ) : null}
      </div>

      <div className="mobile-toggle">
        <button
          className={mobileView === 'list' ? 'on' : ''}
          onClick={() => setMobileView('list')}
        >
          List
        </button>
        <button
          className={mobileView === 'map' ? 'on' : ''}
          onClick={() => setMobileView('map')}
        >
          Map
        </button>
      </div>

      <main className="layout">
        <section className={`panel ${mobileView === 'map' ? 'panel-hidden' : ''}`}>
          <div className="delivery-panel-head">
            <h2>Gluten-free delivery</h2>
            <p className="muted">
              {area
                ? `Spots that deliver around ${area}, closest first.`
                : 'Every celiac-safe spot that delivers. Check the menu, then pick your app.'}
            </p>
            <SafetyKeyButton onClick={onExplainColors} />
          </div>
          <div className="dcard-list">
            {list.length === 0 ? (
              <p className="muted" style={{ padding: '8px 16px' }}>
                Nothing here yet — try “Everywhere.”
              </p>
            ) : (
              list.map(({ r, d }) => (
                <DeliveryCard
                  key={r.id}
                  r={r}
                  distMi={d}
                  selected={selectedId === r.id}
                  onOpen={onOpenRestaurant}
                  onSelect={setSelectedId}
                  onOrder={setOrderFor}
                />
              ))
            )}
          </div>
          <p className="browse-foot muted">
            We link out to DoorDash, Grubhub, and Uber Eats — we can't show live
            menus or take the order here. Restate your celiac needs in the order
            notes. Restaurant photos via{' '}
            <a href="https://www.yelp.com" target="_blank" rel="noreferrer">
              Yelp
            </a>{' '}
            and the restaurants' own sites.
          </p>
        </section>

        <section className="map-wrap">
          <ErrorBoundary
            fallback={
              <div className="error-fallback error-fallback-map">
                <p>The map hit a snag. The list still works.</p>
              </div>
            }
          >
            <MapView
              restaurants={list.map((x) => x.r)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              userPosition={position}
              locateStatus={locateStatus}
              onLocate={onLocate}
              fitRequest={fitRequest}
            />
          </ErrorBoundary>
          <button
            type="button"
            className="map-legend"
            onClick={onExplainColors}
            title="What do the colors mean?"
          >
            <span>
              <i style={{ background: '#1b7f4b' }} /> Dedicated GF
            </span>
            <span>
              <i style={{ background: '#2f6fb0' }} /> Celiac-friendly
            </span>
            <span>
              <i style={{ background: '#b07d2f' }} /> GF menu
            </span>
            <span className="map-legend-more">What do these mean? ›</span>
          </button>
        </section>
      </main>

      {showPicker && chosen ? (
        <CityPicker
          canClose
          onClose={() => setShowPicker(false)}
          onPick={chooseArea}
          onUseLocation={useLocation}
          locating={locateStatus === 'locating'}
        />
      ) : null}
      {orderFor ? (
        <OrderChoice restaurant={orderFor} onClose={() => setOrderFor(null)} />
      ) : null}
    </>
  );
}
