import { useMemo, useState } from 'react';
import { restaurants as ALL } from './data/restaurants';
import Filters from './components/Filters';
import RestaurantList from './components/RestaurantList';
import MapView from './components/MapView';
import RestaurantDetail from './components/RestaurantDetail';
import './App.css';

const INITIAL_FILTERS = {
  safety: new Set(),
  cuisine: new Set(),
  dedicatedFryer: false,
  celiacVerified: false,
  maxPrice: 4,
};

export default function App() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'
  const [showFilters, setShowFilters] = useState(false);
  const [reviewsVersion, setReviewsVersion] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL.filter((r) => {
      if (filters.safety.size && !filters.safety.has(r.safetyLevel)) return false;
      if (filters.dedicatedFryer && !r.dedicatedFryer) return false;
      if (filters.celiacVerified && !r.celiacVerified) return false;
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
  }, [filters, query]);

  const detailRestaurant = ALL.find((r) => r.id === detailId) || null;

  function selectRestaurant(id) {
    setSelectedId(id);
    setDetailId(id);
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
              total={ALL.length}
            />
          </div>
          <div className="list-wrap">
            <RestaurantList
              restaurants={filtered}
              selectedId={selectedId}
              onSelect={selectRestaurant}
              reviewsVersion={reviewsVersion}
            />
          </div>
        </section>

        <section className="map-wrap">
          <MapView
            restaurants={filtered}
            selectedId={selectedId}
            onSelect={selectRestaurant}
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
          </div>
        </section>
      </main>

      {detailRestaurant ? (
        <RestaurantDetail
          restaurant={detailRestaurant}
          onClose={() => setDetailId(null)}
          onReviewChange={() => setReviewsVersion((v) => v + 1)}
        />
      ) : null}
    </div>
  );
}
