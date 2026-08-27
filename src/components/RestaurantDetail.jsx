import { useState } from 'react';
import {
  SAFETY_META,
  priceLabel,
  directionsUrl,
  directionsProvider,
  verifiedLabel,
  untilLabel,
} from '../lib/format';
import { getReviews, addReview, deleteReview, summarize } from '../lib/reviews';
import {
  getVisits,
  checkIn,
  checkInStatus,
  undoLastCheckIn,
  POINTS,
} from '../lib/profile';
import { haversineMiles, formatDistance, walkMinutes } from '../lib/geo';
import { useCloud } from '../lib/CloudContext';
import ReviewForm from './ReviewForm';
import PostComposer from './PostComposer';
import PostCard from './PostCard';

const VERIFY_RADIUS_MI = 0.2;

export default function RestaurantDetail({
  restaurant,
  onClose,
  onReviewChange,
  onProfileChange,
  onTagClick,
  userPosition,
}) {
  const { posts: allPosts, removePost, user } = useCloud();
  const [flash, setFlash] = useState(null);
  if (!restaurant) return null;
  const r = restaurant;
  const meta = SAFETY_META[r.safetyLevel];
  const reviews = getReviews(r.id);
  const stats = summarize(reviews);

  const visits = getVisits(r.id);
  const distMi = userPosition ? haversineMiles(userPosition, r) : null;
  const canVerify = distMi != null && distMi <= VERIFY_RADIUS_MI;
  const posts = allPosts.filter((p) => p.restaurantId === r.id);

  // recompute on flash so the button re-locks right after a check-in
  void flash;
  const checkin = checkInStatus(r.id);

  function handleAdd(payload) {
    addReview(r.id, payload);
    onReviewChange();
    onProfileChange?.();
  }

  function handleDelete(id) {
    deleteReview(r.id, id);
    onReviewChange();
    onProfileChange?.();
  }

  function handleCheckIn() {
    const res = checkIn(r.id, { verified: canVerify });
    if (!res.ok) {
      setFlash(
        `You already checked in here today — one per spot per day. Come back in ${untilLabel(
          res.nextAllowedAt
        )}.`
      );
      return;
    }
    let earned = canVerify ? POINTS.verifiedCheckIn : POINTS.checkIn;
    if (res.isFirst) earned += POINTS.discovery;
    if (r.featured) earned += POINTS.featuredBonus;
    setFlash(
      `Checked in${canVerify ? ' (GPS confirmed)' : ''}. +${earned} points${
        res.isFirst ? ' — first visit!' : ''
      }`
    );
    onProfileChange?.();
  }

  function handleUndo() {
    undoLastCheckIn(r.id);
    setFlash(null);
    onProfileChange?.();
  }

  return (
    <>
      <div className="detail-scrim" onClick={onClose} />
      <aside className="detail" role="dialog" aria-label={r.name}>
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="detail-head" style={{ borderColor: meta.color }}>
          <span className="badge-row">
            <span className="badge" style={{ background: meta.color }}>
              {meta.short}
            </span>
            {r.featured ? <span className="badge badge-featured">★ Featured</span> : null}
          </span>
          <h2>{r.name}</h2>
          <p className="detail-sub">
            {r.neighborhood} · {r.cuisine.join(', ')} · {priceLabel(r.priceLevel)}
            {distMi != null ? ` · ${formatDistance(distMi)} away` : ''}
          </p>
        </div>

        <div className="checkin">
          <div className="checkin-main">
            <button
              className="btn"
              onClick={handleCheckIn}
              disabled={!checkin.allowed}
            >
              {checkin.allowed
                ? 'Check in here'
                : `Checked in today · again in ${untilLabel(checkin.nextAllowedAt)}`}
            </button>
            <span className="checkin-count">
              {visits.length === 0
                ? 'Never checked in'
                : `${visits.length}× visit${visits.length > 1 ? 's' : ''}` +
                  ` · last ${new Date(visits.at(-1).date).toLocaleDateString()}`}
            </span>
          </div>
          {distMi != null && !canVerify ? (
            <p className="muted">
              You're {formatDistance(distMi)} out (~{walkMinutes(distMi)} min
              walk). Check in within {VERIFY_RADIUS_MI * 5280} ft for the GPS
              bonus.
            </p>
          ) : null}
          {flash ? (
            <p className="checkin-flash">
              {flash} <button className="link-btn" onClick={handleUndo}>undo</button>
            </p>
          ) : null}
        </div>

        <p className="detail-blurb">{meta.blurb}</p>
        <p>{r.summary}</p>

        {r.whatToOrder ? (
          <div className="detail-block">
            <h3>What to order</h3>
            <p>{r.whatToOrder}</p>
          </div>
        ) : null}

        <div className="detail-facts">
          <div>
            <dt>Dedicated GF fryer</dt>
            <dd>{r.dedicatedFryer ? 'Yes' : 'No / shared'}</dd>
          </div>
          <div>
            <dt>Community celiac-verified</dt>
            <dd>{r.celiacVerified ? 'Yes' : 'Not yet'}</dd>
          </div>
          <div>
            <dt>Safety info last reported</dt>
            <dd>{verifiedLabel(r.lastVerified) || 'Unknown'}</dd>
          </div>
        </div>

        <div className="detail-links">
          <a
            href={directionsUrl(r, userPosition)}
            target="_blank"
            rel="noreferrer"
            className="btn"
          >
            Directions{userPosition ? ' from here' : ''}
            <span className="btn-sub"> · {directionsProvider()}</span>
          </a>
          {r.website ? (
            <a href={r.website} target="_blank" rel="noreferrer" className="btn btn-ghost">
              Website
            </a>
          ) : null}
          {r.phone ? (
            <a href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`} className="btn btn-ghost">
              {r.phone}
            </a>
          ) : null}
        </div>

        <p className="detail-address">{r.address}</p>

        <div className="detail-block">
          <h3>
            Celiac reviews{' '}
            {stats ? (
              <span className="muted">
                — {stats.avgRating}★ from {stats.count}
                {stats.glutenedCount > 0
                  ? `, ${stats.glutenedCount} glutening reported`
                  : ''}
              </span>
            ) : (
              <span className="muted">— none yet</span>
            )}
          </h3>

          <ReviewForm onSubmit={handleAdd} />

          <ul className="review-list">
            {reviews.map((rev) => (
              <li key={rev.id} className="review">
                <div className="review-top">
                  <span className="stars">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </span>
                  {rev.glutened ? <span className="chip-warn">Got glutened</span> : null}
                  <button
                    className="link-btn"
                    onClick={() => handleDelete(rev.id)}
                  >
                    delete
                  </button>
                </div>
                {rev.text ? <p>{rev.text}</p> : null}
                <time>{new Date(rev.date).toLocaleDateString()}</time>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-block">
          <h3>
            Posts &amp; photos{' '}
            <span className="muted">— {posts.length || 'none yet'}</span>
          </h3>
          <PostComposer restaurantId={r.id} />
          <div className="post-list">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onTagClick={onTagClick}
                canDelete={!p.cloud || p.uid === user?.uid}
                onDelete={(post) => removePost(post)}
              />
            ))}
          </div>
        </div>

        <p className="disclaimer">
          Always confirm your needs with the restaurant. Protocols, menus, and
          staff change — this guide is a starting point, not a medical guarantee.
        </p>
      </aside>
    </>
  );
}
