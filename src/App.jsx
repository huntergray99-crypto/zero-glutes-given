import { useEffect, useMemo, useRef, useState } from 'react';
import { restaurants as ALL } from './data/restaurants';
import Filters from './components/Filters';
import RestaurantList from './components/RestaurantList';
import MapView from './components/MapView';
import RestaurantDetail from './components/RestaurantDetail';
import ProfilePanel from './components/ProfilePanel';
import FeedPanel from './components/FeedPanel';
import Toast from './components/Toast';
import { useGeolocation } from './lib/useGeolocation';
import { haversineMiles, formatDistance, walkMinutes } from './lib/geo';
import { nudgeLine } from './lib/nudges';
import { computeStats } from './lib/profile';
import './App.css';

const INITIAL_FILTERS = {
  safety: new Set(),
  cuisine: new Set(),
  dedicatedFryer: false,
  celiacVerified: false,
  maxPrice: 4,
  showHonorable: false,
};

const CELIAC_COUNT = ALL.filter((r) => !r.honorableMention).length;

const NUDGE_RADIUS_MI = 0.3;
const NUDGE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per restaurant

function loadNudgeLog() {
  try {
    return JSON.parse(localStorage.getItem('zgg.nudges') || '{}');
  } catch {
    return {};
  }
}

export default function App() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [feedTag, setFeedTag] = useState(undefined); // undefined = closed
  const [reviewsVersion, setReviewsVersion] = useState(0);
  const [profileVersion, setProfileVersion] = useState(0);
  const [postsVersion, setPostsVersion] = useState(0);
  const [toast, setToast] = useState(null);

  const { position, status: locateStatus, toggle: toggleLocate } = useGeolocation();
  const nudgeLog = useRef(loadNudgeLog());

  const bumpProfile = () => setProfileVersion((v) => v + 1);
  const bumpPosts = () => setPostsVersion((v) => v + 1);
  const openFeed = (tag = null) => setFeedTag(tag);

  // Spots eligible before cuisine/search/price — used both for the list and to
  // count how many spots each cuisine chip would show.
  const eligible = useMemo(
    () =>
      ALL.filter((r) => {
        if (r.honorableMention) return filters.showHonorable && !filters.safety.size;
        if (filters.safety.size && !filters.safety.has(r.safetyLevel)) return false;
        if (filters.dedicatedFryer && !r.dedicatedFryer) return false;
        if (filters.celiacVerified && !r.celiacVerified) return false;
        return true;
      }),
    [filters.showHonorable, filters.safety, filters.dedicatedFryer, filters.celiacVerified]
  );

  const cuisineCounts = useMemo(() => {
    const counts = {};
    for (const r of eligible)
      for (const c of r.cuisine) counts[c] = (counts[c] || 0) + 1;
    return counts;
  }, [eligible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = eligible.filter((r) => {
      if (r.priceLevel > filters.maxPrice) return false;
      if (filters.cuisine.size && !r.cuisine.some((c) => filters.cuisine.has(c)))
        return false;
      if (
        q &&
        !(
          r.name.toLowerCase().includes(q) ||
          r.neighborhood.toLowerCase().includes(q) ||
          r.cuisine.join(' ').toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
    if (position) {
      list.sort(
        (a, b) => haversineMiles(position, a) - haversineMiles(position, b)
      );
    } else {
      // spotlight spots first, then featured, then the rest
      list.sort(
        (a, b) =>
          (b.spotlight ? 1 : 0) - (a.spotlight ? 1 : 0) ||
          (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
      );
    }
    return list;
  }, [eligible, filters.maxPrice, filters.cuisine, query, position]);

  // Proximity nudge: when a location fix comes in, nag about the nearest spot
  // you haven't been nagged about in the last hour.
  useEffect(() => {
    if (!position) return;
    const now = Date.now();
    let best = null;
    for (const r of ALL) {
      if (r.honorableMention) continue; // only nudge toward celiac-safe spots
      const d = haversineMiles(position, r);
      if (d > NUDGE_RADIUS_MI) continue;
      const last = nudgeLog.current[r.id] || 0;
      if (now - last < NUDGE_COOLDOWN_MS) continue;
      if (!best || d < best.d) best = { r, d };
    }
    if (!best) return;
    nudgeLog.current[best.r.id] = now;
    try {
      localStorage.setItem('zgg.nudges', JSON.stringify(nudgeLog.current));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react/set-state-in-effect -- reacting to a geolocation fix (external system)
    setToast({
      kind: 'nudge',
      message: nudgeLine(
        best.r.name,
        formatDistance(best.d),
        walkMinutes(best.d)
      ),
      action: {
        label: 'Show me',
        onClick: () => {
          setSelectedId(best.r.id);
          setDetailId(best.r.id);
        },
      },
      duration: 11000,
    });
  }, [position]);

  const detailRestaurant = ALL.find((r) => r.id === detailId) || null;
  // recomputed each render; cheap, and profile/review bumps force the render
  void profileVersion;
  void reviewsVersion;
  const stats = computeStats();

  function selectRestaurant(id) {
    setSelectedId(id);
    setDetailId(id);
  }

  function openFromProfile(id) {
    setShowProfile(false);
    selectRestaurant(id);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 32 32" width="30" height="30">
              <circle cx="16" cy="16" r="15" fill="#1b7f4b" />
              <path
                d="M12 7v6.5a2 2 0 0 0 4 0V7M14 7v18M20.5 7c-1.6 1-2.2 3-2.2 6s.6 5 2.2 6V7z"
                stroke="#fff"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="6.5"
                y1="25.5"
                x2="25.5"
                y2="6.5"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="brand-text">
            <h1>Zero Glutes Given</h1>
            <p>Celiac-safe dining in Seattle</p>
          </div>
        </div>

        <input
          className="search"
          type="search"
          placeholder="Search name, neighborhood, cuisine…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button className="feed-btn" onClick={() => openFeed(null)} title="Community feed">
          Feed
        </button>

        <button
          className="points-pill"
          onClick={() => setShowProfile(true)}
          title="Your card"
        >
          <strong>{stats.points}</strong> pts
          <span className="points-pill-level">{stats.level.name}</span>
        </button>
      </header>

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
        <button
          className={`filter-toggle ${showFilters ? 'on' : ''}`}
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters
        </button>
      </div>

      <main className="layout">
        <section className={`panel ${mobileView === 'map' ? 'panel-hidden' : ''}`}>
          <div className={`filters-wrap ${showFilters ? 'open' : ''}`}>
            <Filters
              filters={filters}
              setFilters={setFilters}
              count={filtered.length}
              total={filters.showHonorable ? ALL.length : CELIAC_COUNT}
              cuisineCounts={cuisineCounts}
            />
          </div>
          <div className="list-wrap">
            <RestaurantList
              restaurants={filtered}
              selectedId={selectedId}
              onSelect={selectRestaurant}
              reviewsVersion={reviewsVersion}
              profileVersion={profileVersion}
              userPosition={position}
            />
          </div>
        </section>

        <section className="map-wrap">
          <MapView
            restaurants={filtered}
            selectedId={selectedId}
            onSelect={selectRestaurant}
            userPosition={position}
            locateStatus={locateStatus}
            onLocate={toggleLocate}
          />
          <div className="map-legend">
            <span>
              <i style={{ background: '#1b7f4b' }} /> Dedicated GF
            </span>
            <span>
              <i style={{ background: '#2f6fb0' }} /> Celiac-friendly
            </span>
            <span>
              <i style={{ background: '#b07d2f' }} /> GF menu
            </span>
            {filters.showHonorable ? (
              <span>
                <i style={{ background: '#8a8f98', opacity: 0.6 }} /> Honorable
                mention
              </span>
            ) : null}
          </div>
        </section>
      </main>

      {detailRestaurant ? (
        <RestaurantDetail
          restaurant={detailRestaurant}
          onClose={() => setDetailId(null)}
          onReviewChange={() => setReviewsVersion((v) => v + 1)}
          onProfileChange={bumpProfile}
          onPostsChange={bumpPosts}
          onTagClick={(tag) => openFeed(tag)}
          postsVersion={postsVersion}
          userPosition={position}
        />
      ) : null}

      {showProfile ? (
        <ProfilePanel
          onClose={() => setShowProfile(false)}
          onOpenRestaurant={openFromProfile}
          version={profileVersion + reviewsVersion}
        />
      ) : null}

      {feedTag !== undefined ? (
        <FeedPanel
          initialTag={feedTag}
          onClose={() => setFeedTag(undefined)}
          onOpenRestaurant={(id) => {
            setFeedTag(undefined);
            selectRestaurant(id);
          }}
          version={postsVersion}
          onChange={bumpPosts}
        />
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
