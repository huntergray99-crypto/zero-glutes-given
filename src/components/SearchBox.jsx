import { useEffect, useMemo, useRef, useState } from 'react';
import { SAFETY_META } from '../lib/format';
import { matchRestaurant } from '../lib/search';

// Header search: dark text on white, a live results dropdown, a clickable
// search icon, and Enter/Go to run the search. Picking a result or submitting
// hands back up to App, which re-centers the map.
export default function SearchBox({ query, setQuery, options, onPick, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  const q = query.trim();

  const allMatches = useMemo(() => {
    if (!q) return [];
    return options.filter((r) => matchRestaurant(r, q));
  }, [q, options]);

  const matches = allMatches.slice(0, 7);
  const moreCount = allMatches.length - matches.length;

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function choose(r) {
    setQuery(r.name);
    setOpen(false);
    onPick(r.id);
  }

  function submit() {
    setOpen(false);
    onSubmit(query);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHi((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && matches[hi]) choose(matches[hi]);
      else submit();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="searchbox" ref={boxRef}>
      <input
        className="search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Search name, neighborhood, cuisine…"
        value={query}
        aria-label="Search restaurants"
        onChange={(e) => {
          setQuery(e.target.value);
          setHi(0);
          setOpen(true);
        }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="search-go"
        onClick={submit}
        aria-label="Search"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M20 20l-4.5-4.5M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
          />
        </svg>
      </button>

      {open && matches.length > 0 ? (
        <ul className="search-dropdown">
          {matches.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                className={`search-opt ${i === hi ? 'hi' : ''}`}
                onMouseEnter={() => setHi(i)}
                onClick={() => choose(r)}
              >
                <span
                  className="dot"
                  style={{ background: SAFETY_META[r.safetyLevel].color }}
                />
                <span className="search-opt-name">{r.name}</span>
                <span className="search-opt-sub">{r.neighborhood}</span>
              </button>
            </li>
          ))}
          {moreCount > 0 ? (
            <li>
              <button type="button" className="search-opt search-opt-more" onClick={submit}>
                +{moreCount} more — show all on the map
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
