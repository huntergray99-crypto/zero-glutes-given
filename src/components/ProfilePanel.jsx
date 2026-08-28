import { useEffect, useState } from 'react';
import { computeStats, setHandle as setLocalProfileHandle, LEVELS } from '../lib/profile';
import { badgeProgress } from '../lib/badges';
import { SAFETY_META } from '../lib/format';
import { shareApp } from '../lib/share';
import { useCloud } from '../lib/CloudContext';
import MyPhotos from './MyPhotos';

export default function ProfilePanel({ onClose, onOpenRestaurant, version }) {
  const {
    user,
    signedIn,
    isGuest,
    authReady,
    handle,
    updateHandle,
    leaderboard,
    needsMigration,
    migrate,
    signInGoogle,
    signInGuest,
    signOut,
    posts: feedPosts,
  } = useCloud();

  const myPostCount = signedIn
    ? feedPosts.filter((p) => p.uid === user?.uid).length
    : feedPosts.length;
  const stats = computeStats({ posts: myPostCount });
  const badges = badgeProgress(stats);
  const earnedCount = badges.filter((b) => b.done).length;
  const [handleInput, setHandleInput] = useState(handle || stats.handle);
  const [authBusy, setAuthBusy] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState(null);
  const [migrateDone, setMigrateDone] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [shareMsg, setShareMsg] = useState(null);

  async function handleShareApp() {
    const res = await shareApp();
    if (res === 'copied') setShareMsg('Link copied');
    else if (res === 'failed') setShareMsg('Could not share');
    if (res === 'copied' || res === 'failed') setTimeout(() => setShareMsg(null), 2000);
  }

  useEffect(() => {
    setHandleInput(handle || stats.handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  function commitHandle() {
    const h = handleInput.trim();
    updateHandle(h);
    setLocalProfileHandle(h);
  }

  async function run(fn) {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setAuthError('Sign-in failed. Check that this domain is authorized in Firebase.');
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function doMigrate() {
    setMigrateMsg('Moving…');
    try {
      const n = await migrate();
      setMigrateMsg(n > 0 ? `Moved ${n} post${n > 1 ? 's' : ''} to your account.` : 'Nothing to move.');
      setMigrateDone(true);
    } catch (e) {
      console.error(e);
      setMigrateMsg('Could not move posts. Try again.');
    }
  }

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

        <div className="account">
          {!authReady ? (
            <p className="muted">Connecting…</p>
          ) : signedIn ? (
            <div className="account-in">
              <div>
                <strong>
                  {isGuest ? 'Signed in as a guest' : user.displayName || user.email}
                </strong>
                <span className="muted">
                  {isGuest
                    ? 'Your posts are saved to the cloud but tied to this browser.'
                    : user.email}
                </span>
              </div>
              <button className="btn btn-ghost" onClick={() => run(signOut)} disabled={authBusy}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="account-out">
              <p className="muted">
                Sign in to post to the shared feed, sync your card across devices,
                and land on the leaderboard.
              </p>
              <div className="account-btns">
                <button className="btn" onClick={() => run(signInGoogle)} disabled={authBusy}>
                  Continue with Google
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => run(signInGuest)}
                  disabled={authBusy}
                >
                  Continue as guest
                </button>
              </div>
            </div>
          )}
          {authError ? <p className="rf-note rf-note-warn">{authError}</p> : null}
          {needsMigration && !migrateDone ? (
            <div className="migrate">
              <p>You have posts saved on this device. Move them to your account?</p>
              <button className="btn btn-ghost" onClick={doMigrate}>
                Move my posts
              </button>
              {migrateMsg ? <span className="muted"> {migrateMsg}</span> : null}
            </div>
          ) : migrateDone && migrateMsg ? (
            <p className="muted">{migrateMsg}</p>
          ) : null}
        </div>

        <label className="handle-row">
          <span>Handle</span>
          <input
            value={handleInput}
            placeholder="crumbcatcher"
            onChange={(e) => setHandleInput(e.target.value)}
            onBlur={commitHandle}
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
          <h3>Leaderboard</h3>
          {!signedIn ? (
            <p className="muted">Sign in to see where you rank.</p>
          ) : leaderboard.length === 0 ? (
            <p className="muted">
              No one on the board yet. Check in somewhere — you could be first.
            </p>
          ) : (
            <ol className="leaderboard">
              {leaderboard.map((u, i) => (
                <li key={u.uid} className={u.uid === user?.uid ? 'me' : ''}>
                  <span className="lb-rank">{i + 1}</span>
                  <span className="lb-handle">
                    @{u.handle || 'anon'}
                    {u.uid === user?.uid ? ' (you)' : ''}
                  </span>
                  <span className="lb-level">
                    {u.badges ? `${u.badges}🏅 · ` : ''}
                    {u.level}
                  </span>
                  <span className="lb-points">{u.points}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="detail-block">
          <h3>
            Badges <span className="muted">— {earnedCount} of {badges.length}</span>
          </h3>
          <div className="badge-grid">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`badge-cell ${b.done ? 'earned' : 'locked'}`}
                title={b.need}
              >
                <span className="badge-icon">{b.icon}</span>
                <span className="badge-name">{b.name}</span>
                <span className="badge-need">{b.done ? 'Earned' : b.need}</span>
              </div>
            ))}
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

        <MyPhotos onOpenRestaurant={onOpenRestaurant} />

        <div className="detail-block">
          <h3>How points work</h3>
          <ul className="points-key">
            <li>Check in at a spot — <b>+10</b> (<b>+20</b> if we can confirm you're there by GPS)</li>
            <li>First-ever check-in at a spot — <b>+20</b> discovery bonus</li>
            <li>Check in at a <span className="star">★</span> featured spot — <b>+25</b></li>
            <li>Write a celiac review — <b>+15</b></li>
            <li>Share a photo or tip to the feed — <b>+5</b></li>
          </ul>
          <p className="muted">
            Levels: {LEVELS.map((l) => l.name).join(' → ')}. As we partner with
            spots, badge and level holders get first crack at perks —
            reservations, tasting events, GF specials. Early members keep their
            standing.
          </p>
        </div>

        <button className="btn btn-ghost share-app" onClick={handleShareApp}>
          {shareMsg || 'Share Zero Glutes Given'}
        </button>

        <p className="disclaimer">
          {signedIn
            ? 'Your points sync to the cloud from this device. Photos sync once Firebase Storage is switched on.'
            : 'Your card lives in this browser until you sign in. Then it follows you across devices.'}
        </p>
      </aside>
    </>
  );
}
