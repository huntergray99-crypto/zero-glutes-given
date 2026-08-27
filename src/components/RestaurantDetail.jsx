import { SAFETY_META, priceLabel, mapsUrl, verifiedLabel } from '../lib/format';
import { getReviews, addReview, deleteReview, summarize } from '../lib/reviews';
import ReviewForm from './ReviewForm';

export default function RestaurantDetail({ restaurant, onClose, onReviewChange }) {
  if (!restaurant) return null;
  const r = restaurant;
  const meta = SAFETY_META[r.safetyLevel];
  const reviews = getReviews(r.id);
  const stats = summarize(reviews);

  function handleAdd(payload) {
    addReview(r.id, payload);
    onReviewChange();
  }

  function handleDelete(id) {
    deleteReview(r.id, id);
    onReviewChange();
  }

  return (
    <>
      <div className="detail-scrim" onClick={onClose} />
      <aside className="detail" role="dialog" aria-label={r.name}>
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="detail-head" style={{ borderColor: meta.color }}>
          <span className="badge" style={{ background: meta.color }}>
            {meta.short}
          </span>
          <h2>{r.name}</h2>
          <p className="detail-sub">
            {r.neighborhood} · {r.cuisine.join(', ')} · {priceLabel(r.priceLevel)}
          </p>
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
          <a href={mapsUrl(r)} target="_blank" rel="noreferrer" className="btn">
            Directions
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

        <p className="disclaimer">
          Always confirm your needs with the restaurant. Protocols, menus, and
          staff change — this guide is a starting point, not a medical guarantee.
        </p>
      </aside>
    </>
  );
}
