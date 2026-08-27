import { useMemo, useState } from 'react';
import { restaurants } from '../data/restaurants';
import { useCloud } from '../lib/CloudContext';
import PostCard from './PostCard';

const nameById = Object.fromEntries(restaurants.map((r) => [r.id, r.name]));

export default function FeedPanel({ onClose, onOpenRestaurant, onOpenProfile, initialTag = null }) {
  const { posts, signedIn, isGuest, user, removePost, postsError } = useCloud();
  const [tag, setTag] = useState(initialTag);
  const [busy, setBusy] = useState(null);

  const tags = useMemo(() => {
    const counts = {};
    for (const p of posts) for (const t of p.tags || []) counts[t] = (counts[t] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const shown = tag ? posts.filter((p) => (p.tags || []).includes(tag)) : posts;

  async function handleDelete(post) {
    setBusy(post.id);
    try {
      await removePost(post);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="detail-scrim" onClick={onClose} />
      <aside className="detail feed" role="dialog" aria-label="Community feed">
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>Feed</h2>

        <p className="feed-status">
          {signedIn
            ? isGuest
              ? 'Shared feed · you’re posting as a guest'
              : 'Shared feed · live'
            : 'On-device feed. '}
          {!signedIn ? (
            <button className="link-btn" onClick={onOpenProfile}>
              Sign in to join the shared feed
            </button>
          ) : null}
        </p>

        {postsError ? (
          <p className="rf-note rf-note-warn">
            Feed didn’t load — the database rules may still need to be published.
          </p>
        ) : null}

        {tags.length ? (
          <div className="tag-bar">
            <button
              className={`chip ${tag === null ? 'chip-on' : ''}`}
              onClick={() => setTag(null)}
            >
              All
            </button>
            {tags.map(([t, n]) => (
              <button
                key={t}
                className={`chip ${tag === t ? 'chip-on' : ''}`}
                onClick={() => setTag(t)}
              >
                #{t}
                <span className="chip-count">{n}</span>
              </button>
            ))}
          </div>
        ) : null}

        {shown.length === 0 ? (
          <p className="muted">
            {tag
              ? `No posts tagged #${tag} yet.`
              : 'No posts yet. Open a spot and share the first one — a photo of what you ordered, a tip, a #hashtag.'}
          </p>
        ) : (
          <div className="feed-list">
            {shown.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                restaurantName={nameById[p.restaurantId]}
                onTagClick={setTag}
                onDelete={busy === p.id ? undefined : handleDelete}
                canDelete={!p.cloud || p.uid === user?.uid}
                onOpenRestaurant={onOpenRestaurant}
              />
            ))}
          </div>
        )}

        <p className="disclaimer">
          {signedIn
            ? 'Photos still live on the posting device until Firebase Storage is switched on.'
            : 'Posts live on this device for now. Sign in to post to the shared community feed.'}
        </p>
      </aside>
    </>
  );
}
