import { useState } from 'react';
import { computeStats, setHandle, LEVELS } from '../lib/profile';
import { SAFETY_META } from '../lib/format';

export default function ProfilePanel({ onClose, onOpenRestaurant, version }) {
  const stats = computeStats();
  const [handle, setHandleInput] = useState(stats.handle);

  const progress = stats.nextLevel
    ? Math.min(
        100,
        Math.round(
          ((stats.points - stats.level.min) /
            (stats.nextLevel.min - stats.level.min)) *
            100
        )
      )
    : 100;

  return (
    <>
      <div className="detail-scrim" onClick={onClose} />
      <aside className="detail profile" role="dialog" aria-label="Your profile" data-v={version}>
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Your card</h2>

        <label className="handle-row">
          <span>Handle</span>
          <input
            value={handle}
            placeholder="crumbcatcher"
            onChange={(e) => setHandleInput(e.target.value)}
            onBlur={() => setHandle(handle)}
            maxLength={24}
          />
        </label>

        <div className="points-card">
          <div className="points-big">
            {stats.points}
            <span>pts</span>
          </div>
          <div className="level-line">
            <strong>{stats.level.name}</strong>
            {stats.nextLevel ? (
              <span className="muted">
                {stats.nextLevel.min - stats.points} to {stats.nextLevel.name}
              </span>
            ) : (
              <span className="muted">max level — you absolute legend</span>
            )}
          </div>
          <div className="level-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="stat-grid">
          <div>
            <b>{stats.totalCheckIns}</b>
            <span>check-ins</span>
          </div>
          <div>
            <b>{stats.uniqueSpots}</b>
            <span>spots</span>
          </div>
          <div>
            <b>{stats.reviewsWritten}</b>
            <span>reviews</span>
          </div>
          <div>
            <b>{stats.featuredVisited}</b>
            <span>featured</span>
          </div>
        </div>

        <div className="detail-block">
          <h3>Punch card</h3>
          {stats.punchCard.length === 0 ? (
            <p className="muted">
              No check-ins yet. Open a spot and tap “Check in here” when you're
              there — you'll rack up points and we'll keep your visit count.
            </p>
          ) : (
            <ul className="punch-list">
              {stats.punchCard.map(({ restaurant: r, count }) => (
                <li key={r.id}>
                  <button
                    className="punch-row"
                    onClick={() => onOpenRestaurant(r.id)}
                  >
                    <span
                      className="dot"
                      style={{ background: SAFETY_META[r.safetyLevel].color }}
                    />
                    <span className="punch-name">
                      {r.name}
                      {r.featured ? <span className="star"> ★</span> : null}
                    </span>
                    <span className="punch-count">
                      {count}×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="detail-block">
          <h3>How points work</h3>
          <ul className="points-key">
            <li>Check in at a spot — <b>+10</b> (<b>+20</b> if we can confirm you're there by GPS)</li>
            <li>First-ever check-in at a spot — <b>+20</b> discovery bonus</li>
            <li>Check in at a <span className="star">★</span> featured spot — <b>+25</b></li>
            <li>Write a celiac review — <b>+15</b></li>
          </ul>
          <p className="muted">
            Perks for the top eaters are coming. Levels:{' '}
            {LEVELS.map((l) => l.name).join(' → ')}.
          </p>
        </div>

        <p className="disclaimer">
          Your card lives in this browser for now. Accounts, a shared feed, and
          real perks are on the way.
        </p>
      </aside>
    </>
  );
}
