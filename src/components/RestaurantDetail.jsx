import { useState } from 'react';
import {
  SAFETY_META,
  priceLabel,
  directionsUrl,
  directionsProvider,
  verifiedLabel,
  untilLabel,
} from '../lib/format';
import { summarize } from '../lib/reviews';
import { useReviews } from '../lib/useReviews';
import { POINTS } from '../lib/profile';
import { haversineMiles, formatDistance, walkMinutes } from '../lib/geo';
import {
  orderDirect,
  deliveryLinks,
  pickupOnly,
  menuLink,
  rideUrl,
  isLateNow,
} from '../lib/order';
import { shareSpot } from '../lib/share';
import { photoFor, photoCredit } from '../data/cardPhotos';
import { useCloud } from '../lib/CloudContext';
import ReviewForm from './ReviewForm';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import CommentThread from './CommentThread';
import ReportChange from './ReportChange';

const VERIFY_RADIUS_FT = 500;
const VERIFY_RADIUS_MI = VERIFY_RADIUS_FT / 5280;

export default function RestaurantDetail({
  restaurant,
  onClose,
  onReviewChange,
  onProfileChange,
  onTagClick,
  userPosition,
}) {
  const {
    posts: allPosts,
    removePost,
    user,
    getVisits,
    checkInStatus,
    checkIn,
    undoCheckIn,
  } = useCloud();
  const [flash, setFlash] = useState(null);
  const [shareMsg, setShareMsg] = useState(null);
  const {
    reviews,
    add: addReview,
    remove: removeReview,
    error: reviewsError,
    uid: reviewsUid,
    signedIn: reviewsSignedIn,
  } = useReviews(restaurant?.id);
  if (!restaurant) return null;
  const r = restaurant;

  async function handleShare() {
    const result = await shareSpot(r);
    if (result === 'copied') setShareMsg('Link copied');
    else if (result === 'failed') setShareMsg('Could not share');
    if (result === 'copied' || result === 'failed') {
      setTimeout(() => setShareMsg(null), 2000);
    }
  }
  const meta = SAFETY_META[r.safetyLevel];
  const photo = photoFor(r);
  const credit = photoCredit(r);
  const stats = summarize(reviews);

  const visits = getVisits(r.id);
  const distMi = userPosition ? haversineMiles(userPosition, r) : null;
  const canVerify = distMi != null && distMi <= VERIFY_RADIUS_MI;
  const posts = allPosts.filter((p) => p.restaurantId === r.id);
  const late = isLateNow();
  const showDelivery = !r.honorableMention && r.order !== false;
  const direct = orderDirect(r);
  const apps = deliveryLinks(r);
  const noApps = pickupOnly(r) || apps.length === 0;
  const menu = menuLink(r);

  // recompute on flash so the button re-locks right after a check-in
  void flash;
  const checkin = checkInStatus(r.id);

  async function handleAdd(payload) {
    try {
      await addReview(payload);
      onReviewChange();
      onProfileChange?.();
    } catch (err) {
      console.error('add review', err);
    }
  }

  async function handleDelete(rev) {
    try {
      await removeReview(rev);
      onReviewChange();
      onProfileChange?.();
    } catch (err) {
      console.error('delete review', err);
    }
  }

  async function handleCheckIn() {
    let res;
    try {
      res = await checkIn(r.id, { verified: canVerify });
    } catch (err) {
      console.error('check in', err);
      return;
    }
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

  async function handleUndo() {
    try {
      await undoCheckIn(r.id);
    } catch (err) {
      console.error('undo check in', err);
      return;
    }
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

        {photo ? (
          <div className="detail-photo">
            <img src={photo} alt="" decoding="async" />
            {credit ? (
              <a
                className="photo-credit"
                href={credit.yelpUrl}
                target="_blank"
                rel="noreferrer"
              >
                Photo: {credit.credit}
              </a>
            ) : null}
          </div>
        ) : null}

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
              walk). Check in within {VERIFY_RADIUS_FT} ft for the GPS bonus.
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
          {late ? (
            <a href={rideUrl(r)} target="_blank" rel="noreferrer" className="btn btn-night">
              🚕 Ride here
            </a>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={handleShare}>
            {shareMsg || 'Share'}
          </button>
        </div>

        <p className="detail-address">{r.address}</p>

        {r.lateNight ? (
          <p className="late-note">
            🌙 Open late{r.lateNote ? ` — ${r.lateNote}` : ''}
          </p>
        ) : null}

        {r.getThere ? (
          <div className="detail-block">
            <h3>Getting there</h3>
            <dl className="get-there">
              {r.getThere.transit ? (
                <div>
                  <dt>🚆 Transit</dt>
                  <dd>{r.getThere.transit}</dd>
                </div>
              ) : null}
              {r.getThere.bike ? (
                <div>
                  <dt>🚲 Bike</dt>
                  <dd>{r.getThere.bike}</dd>
                </div>
              ) : null}
              {r.getThere.parking ? (
                <div>
                  <dt>🅿️ Parking</dt>
                  <dd>{r.getThere.parking}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        {showDelivery ? (
          <div className="detail-block">
            <h3>Order &amp; pickup</h3>
            {direct ? (
              <a
                href={direct.url}
                target="_blank"
                rel="noreferrer"
                className="btn order-direct"
              >
                🍽 Order direct
                <span className="btn-sub"> · {direct.platform}</span>
              </a>
            ) : null}
            <div className="detail-links">
              {noApps ? (
                menu && !direct ? (
                  <a
                    href={menu.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                  >
                    {menu.label === 'Full menu' ? 'Order on their site' : menu.label}
                  </a>
                ) : null
              ) : (
                apps.map((a) => (
                  <a
                    key={a.key}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                  >
                    {a.label}
                  </a>
                ))
              )}
            </div>
            <p className="rf-note">
              {noApps
                ? `${r.name} doesn't take orders through the delivery apps — order or reserve on their own site.`
                : direct
                  ? 'Ordering direct keeps more of the money with the restaurant and usually gives you a notes field to restate your celiac needs. Any off-site kitchen can differ from the dining room — reconfirm either way.'
                  : 'Delivery kitchens can differ from the dining room — reconfirm your celiac needs in the order notes.'}
            </p>
          </div>
        ) : null}

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

          {reviewsError ? (
            <p className="rf-note rf-note-warn">
              Reviews didn’t load — the database rules may need the new{' '}
              <code>reviews</code> block published.
            </p>
          ) : null}

          <ReviewForm onSubmit={handleAdd} />
          <p className="rf-note">
            {reviewsSignedIn
              ? 'Posted to the shared celiac-safety record for this spot.'
              : 'Saved on this device — sign in on your card to post to the shared record.'}
          </p>

          <ul className="review-list">
            {reviews.map((rev) => (
              <li key={rev.id} className="review">
                <div className="review-top">
                  <span className="stars">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </span>
                  {rev.glutened ? <span className="chip-warn">Got glutened</span> : null}
                  {!rev.cloud || rev.uid === reviewsUid ? (
                    <button
                      className="link-btn"
                      onClick={() => handleDelete(rev)}
                    >
                      delete
                    </button>
                  ) : null}
                </div>
                {rev.text ? <p>{rev.text}</p> : null}
                <time>
                  {rev.pending ? 'just now' : new Date(rev.date).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        </div>

        <CommentThread restaurantId={r.id} />

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

        <div className="detail-block report-block">
          <ReportChange restaurant={r} />
        </div>

        <p className="disclaimer">
          Always confirm your needs with the restaurant. Protocols, menus, and
          staff change — this guide is a starting point, not a medical guarantee.
        </p>
      </aside>
    </>
  );
}
