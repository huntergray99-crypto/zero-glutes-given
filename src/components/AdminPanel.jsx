import { useEffect, useMemo, useState } from 'react';
import {
  watchReports,
  setReportStatus,
  CHANGE_TYPES,
  isUrgent,
  corroboration,
} from '../lib/reports';
import { restaurants } from '../data/restaurants';

const TYPE_LABEL = Object.fromEntries(
  CHANGE_TYPES.map((t) => [t.value, t.label])
);

// Two independent people saying the same thing about the same spot is the
// point at which a report stops being one person's opinion.
const CORROBORATION_THRESHOLD = 2;

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

export default function AdminPanel({ onClose, onOpenRestaurant }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('open');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- reset before subscribing to an external listener
    setError(null);
    return watchReports(setReports, (e) => {
      console.error('reports listener', e);
      setError(e);
    });
  }, []);

  const counts = useMemo(() => corroboration(reports), [reports]);
  const byId = useMemo(
    () => Object.fromEntries(restaurants.map((r) => [r.id, r])),
    []
  );

  const shown = useMemo(() => {
    const list = reports.filter((r) =>
      filter === 'all' ? true : r.status === filter
    );
    // urgent (safety) first, then corroborated, then newest
    return [...list].sort((a, b) => {
      const ua = isUrgent(a) ? 1 : 0;
      const ub = isUrgent(b) ? 1 : 0;
      if (ua !== ub) return ub - ua;
      const ca = counts[`${a.restaurantId}|${a.type}`] || 0;
      const cb = counts[`${b.restaurantId}|${b.type}`] || 0;
      if (ca !== cb) return cb - ca;
      return b.date.localeCompare(a.date);
    });
  }, [reports, filter, counts]);

  const openCount = reports.filter((r) => r.status === 'open').length;
  const urgentCount = reports.filter(isUrgent).length;

  async function move(r, status) {
    setBusyId(r.id);
    try {
      await setReportStatus(r.id, status);
    } catch (e) {
      console.error('set report status', e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="detail-scrim" onClick={onClose} />
      <aside className="detail admin" role="dialog" aria-label="Report queue">
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Report queue</h2>
        <p className="muted">
          Community corrections, newest first. Safety reports sort to the top —
          they mean someone may be acting on information we published.
        </p>

        <div className="admin-summary">
          <div>
            <b>{openCount}</b>
            <span>open</span>
          </div>
          <div className={urgentCount ? 'admin-urgent' : ''}>
            <b>{urgentCount}</b>
            <span>safety</span>
          </div>
          <div>
            <b>{reports.length}</b>
            <span>total</span>
          </div>
        </div>

        {error ? (
          <p className="rf-note rf-note-warn">
            Couldn’t load the queue. This account may not be on the{' '}
            <code>admins</code> allowlist, or the rules need republishing.
          </p>
        ) : null}

        <div className="admin-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip ${filter === f.key ? 'chip-on' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="muted">
            {filter === 'open'
              ? 'Queue is clear. Nothing waiting on you.'
              : 'Nothing here.'}
          </p>
        ) : (
          <ul className="admin-list">
            {shown.map((r) => {
              const n = counts[`${r.restaurantId}|${r.type}`] || 0;
              const corroborated = n >= CORROBORATION_THRESHOLD;
              const spot = r.restaurantId ? byId[r.restaurantId] : null;
              return (
                <li
                  key={r.id}
                  className={`admin-row ${isUrgent(r) ? 'admin-row-urgent' : ''}`}
                >
                  <div className="admin-row-head">
                    <span className={`admin-type admin-type-${r.type}`}>
                      {TYPE_LABEL[r.type] || r.type}
                    </span>
                    {corroborated ? (
                      <span className="admin-flag">
                        {n}× reported — corroborated
                      </span>
                    ) : null}
                    {r.status === 'resolved' ? (
                      <span className="admin-done">resolved</span>
                    ) : null}
                    <time>
                      {r.pending
                        ? 'just now'
                        : new Date(r.date).toLocaleDateString()}
                    </time>
                  </div>

                  <div className="admin-row-spot">
                    {spot ? (
                      <button
                        className="link-btn"
                        onClick={() => onOpenRestaurant(spot.id)}
                      >
                        {spot.name}
                      </button>
                    ) : (
                      <span>{r.restaurantName || 'New spot suggestion'}</span>
                    )}
                    {r.handle ? (
                      <span className="muted"> · @{r.handle}</span>
                    ) : null}
                  </div>

                  {r.text ? <p className="admin-row-text">{r.text}</p> : null}

                  <div className="admin-row-actions">
                    {r.status === 'open' ? (
                      <button
                        className="btn btn-ghost"
                        disabled={busyId === r.id}
                        onClick={() => move(r, 'resolved')}
                      >
                        {busyId === r.id ? 'Saving…' : 'Mark resolved'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost"
                        disabled={busyId === r.id}
                        onClick={() => move(r, 'open')}
                      >
                        {busyId === r.id ? 'Saving…' : 'Reopen'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="disclaimer">
          Triage only for now: restaurant facts live in a static data file, so
          applying a correction still means a code change and a deploy. Moving
          safety metadata into the database is what turns these into one-click
          fixes.
        </p>
      </aside>
    </>
  );
}
