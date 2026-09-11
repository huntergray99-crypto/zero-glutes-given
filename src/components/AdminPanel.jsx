import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  watchReports,
  setReportStatus,
  CHANGE_TYPES,
  isUrgent,
  corroboration,
} from '../lib/reports';
import { useAllRestaurants } from '../lib/restaurantStore';
import { saveOverride, clearOverride } from '../lib/overrides';
import { getEntitlement, setEntitlement } from '../lib/entitlements';
import { trustScore, trustTier } from '../lib/trust';
import { SAFETY_META } from '../lib/format';

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

const SAFETY_LEVELS = ['dedicated', 'celiac-friendly', 'gf-menu'];

// One person's report, whatever their trust tier, is still one person's
// report — a quick-apply only appears once corroboration hits the threshold
// AND at least one of the corroborating reporters isn't a brand-new account.
// A single anonymous claim, however confident, never auto-suggests a fix.
function TrustBadge({ card }) {
  if (!card) return null;
  const score = trustScore(card);
  const tier = trustTier(score);
  if (!tier.badge) return null;
  return (
    <span className={`trust-badge trust-${tier.name.toLowerCase()}`} title={`Trust score ${score}/100`}>
      {tier.badge} {tier.name}
    </span>
  );
}

// Apply a correction to a spot without a deploy. Writes only the fields that
// changed into the spot's override doc; everything else keeps falling through
// to the bundled baseline.
function FixForm({ spot, onDone }) {
  const [safetyLevel, setSafetyLevel] = useState(spot.safetyLevel);
  const [dedicatedFryer, setDedicatedFryer] = useState(!!spot.dedicatedFryer);
  const [celiacVerified, setCeliacVerified] = useState(!!spot.celiacVerified);
  const [closed, setClosed] = useState(!!spot.closed);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const thisMonth = new Date().toISOString().slice(0, 7);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await saveOverride(
        spot.id,
        {
          safetyLevel,
          dedicatedFryer,
          celiacVerified,
          closed,
          lastVerified: thisMonth,
        },
        note
      );
      setMsg('Saved — live for everyone.');
      onDone?.();
    } catch (e) {
      console.error('save override', e);
      setMsg('Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function revert() {
    setBusy(true);
    setMsg(null);
    try {
      await clearOverride(spot.id);
      setMsg('Reverted to the published data.');
      onDone?.();
    } catch (e) {
      console.error('clear override', e);
      setMsg('Could not revert.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-fix">
      <label className="rf-row">
        <span>Safety level</span>
        <select
          value={safetyLevel}
          onChange={(e) => setSafetyLevel(e.target.value)}
        >
          {SAFETY_LEVELS.map((l) => (
            <option key={l} value={l}>
              {SAFETY_META[l].label}
            </option>
          ))}
        </select>
      </label>

      <label className="rf-check">
        <input
          type="checkbox"
          checked={dedicatedFryer}
          onChange={(e) => setDedicatedFryer(e.target.checked)}
        />
        Dedicated gluten-free fryer
      </label>

      <label className="rf-check">
        <input
          type="checkbox"
          checked={celiacVerified}
          onChange={(e) => setCeliacVerified(e.target.checked)}
        />
        Community celiac-verified
      </label>

      <label className="rf-check">
        <input
          type="checkbox"
          checked={closed}
          onChange={(e) => setClosed(e.target.checked)}
        />
        Permanently closed — hide from the app
      </label>

      <input
        className="admin-note"
        placeholder="What changed, and how you know (kept on the record)"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="admin-row-actions">
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : `Publish fix · re-verified ${thisMonth}`}
        </button>
        {spot._override ? (
          <button className="btn btn-ghost" onClick={revert} disabled={busy}>
            Revert
          </button>
        ) : null}
      </div>

      {msg ? <p className="rf-note">{msg}</p> : null}
      {spot._override?.updatedAt ? (
        <p className="rf-note">
          Last corrected{' '}
          {new Date(spot._override.updatedAt).toLocaleDateString()}
          {spot._override.updatedByHandle
            ? ` by @${spot._override.updatedByHandle}`
            : ''}
          {spot._override.note ? ` — “${spot._override.note}”` : ''}
        </p>
      ) : null}
    </div>
  );
}

// Manual premium grant/revoke by uid — the comp mechanism until a real
// payment processor (Stripe/RevenueCat) is wired up and does this via
// webhook instead. "uid" not "email" because that's what entitlements are
// keyed by; find it in Firebase console → Authentication → Users.
function CompForm() {
  const [uid, setUid] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function check() {
    if (!uid.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const ent = await getEntitlement(uid.trim());
      setStatus(ent.premium ? 'premium' : 'free');
    } catch (e) {
      console.error('check entitlement', e);
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }

  async function grant(premium) {
    if (!uid.trim()) return;
    setBusy(true);
    try {
      await setEntitlement(uid.trim(), { premium, source: 'admin' });
      setStatus(premium ? 'premium' : 'free');
    } catch (e) {
      console.error('set entitlement', e);
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="link-btn admin-comp-toggle" onClick={() => setOpen(true)}>
        ✨ Comp someone premium
      </button>
    );
  }

  return (
    <div className="admin-fix admin-comp">
      <label className="rf-row">
        <span>User uid</span>
        <input
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="Authentication → Users → copy uid"
        />
      </label>
      <div className="admin-row-actions">
        <button className="btn btn-ghost" onClick={check} disabled={busy || !uid.trim()}>
          Check status
        </button>
        <button className="btn" onClick={() => grant(true)} disabled={busy || !uid.trim()}>
          Grant premium
        </button>
        <button className="btn btn-ghost" onClick={() => grant(false)} disabled={busy || !uid.trim()}>
          Revoke
        </button>
      </div>
      {status ? (
        <p className="rf-note">
          {status === 'error'
            ? 'Something went wrong.'
            : `Currently: ${status}.`}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminPanel({ onClose, onOpenRestaurant }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('open');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- reset before subscribing to an external listener
    setError(null);
    return watchReports(setReports, (e) => {
      console.error('reports listener', e);
      setError(e);
    });
  }, []);

  const counts = useMemo(() => corroboration(reports), [reports]);
  const spots = useAllRestaurants();
  const byId = useMemo(
    () => Object.fromEntries(spots.map((r) => [r.id, r])),
    [spots]
  );

  // Reporter trust cards — fetched from the already-public users/{uid}
  // collection, cached by uid so re-renders don't refetch. See trust.js for
  // why this reads the public leaderboard card rather than anything private.
  const [trustCards, setTrustCards] = useState({});
  useEffect(() => {
    const uids = [...new Set(reports.map((r) => r.uid).filter(Boolean))];
    const missing = uids.filter((u) => !(u in trustCards));
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          return [uid, snap.exists() ? snap.data() : null];
        } catch {
          return [uid, null];
        }
      })
    ).then((pairs) => {
      if (cancelled) return;
      setTrustCards((prev) => {
        const next = { ...prev };
        for (const [uid, card] of pairs) next[uid] = card;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [reports, trustCards]);

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

  // One click instead of opening the fix form and re-typing what the report
  // already says — but only once two independent people agree AND at least
  // one of them isn't a brand-new account. Still a human's click, on
  // purpose: see trust.js for why this never fires without one.
  async function quickApplyClosed(r) {
    setBusyId(r.id);
    try {
      const n = counts[`${r.restaurantId}|${r.type}`] || 0;
      await saveOverride(
        r.restaurantId,
        { closed: true, lastVerified: new Date().toISOString().slice(0, 7) },
        `Quick-applied from ${n} corroborating "closed" reports.`
      );
      await setReportStatus(r.id, 'resolved');
    } catch (e) {
      console.error('quick apply', e);
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

        <CompForm />

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
              const reporterCard = trustCards[r.uid];
              // corroborated + at least one non-New reporter on this
              // restaurant+type pair is what unlocks the one-click path
              const hasEstablishedCorroborator = reports.some(
                (o) =>
                  o.restaurantId === r.restaurantId &&
                  o.type === r.type &&
                  o.status === 'open' &&
                  trustTier(trustScore(trustCards[o.uid])).name !== 'New'
              );
              const canQuickApply =
                r.type === 'closed' &&
                spot &&
                corroborated &&
                hasEstablishedCorroborator;
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
                    <TrustBadge card={reporterCard} />
                  </div>

                  {r.text ? <p className="admin-row-text">{r.text}</p> : null}

                  <div className="admin-row-actions">
                    {canQuickApply && r.status === 'open' ? (
                      <button
                        className="btn admin-quick-apply"
                        disabled={busyId === r.id}
                        onClick={() => quickApplyClosed(r)}
                        title={`${n} corroborating reports, including at least one established account`}
                      >
                        {busyId === r.id ? 'Applying…' : `⚡ Quick-apply: mark closed (${n}×)`}
                      </button>
                    ) : null}
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
                    {spot ? (
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          setEditing(editing === r.id ? null : r.id)
                        }
                      >
                        {editing === r.id ? 'Close' : 'Fix the data'}
                      </button>
                    ) : null}
                  </div>

                  {spot && editing === r.id ? (
                    <FixForm
                      spot={spot}
                      onDone={() => setEditing((e) => e)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <p className="disclaimer">
          “Fix the data” publishes a correction immediately, for everyone, with
          no deploy — it’s stored as an override on top of the published
          dataset and is reversible. Safety level, fryer, and verification
          status are editable here; anything else still needs a code change.
          Trust badges come from public activity (verified check-ins, reviews,
          badges) — a signal to help you triage faster, never a substitute
          for reading the report. Quick-apply only appears once independent
          reports corroborate each other and never fires on its own.
        </p>
      </aside>
    </>
  );
}
