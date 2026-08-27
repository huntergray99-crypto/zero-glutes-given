import { useMemo, useState } from 'react';
import { restaurants } from '../data/restaurants';
import { getAllPosts, deletePost, allHashtags } from '../lib/posts';
import PostCard from './PostCard';

const nameById = Object.fromEntries(restaurants.map((r) => [r.id, r.name]));

export default function FeedPanel({
  onClose,
  onOpenRestaurant,
  version,
  onChange,
  initialTag = null,
}) {
  const [tag, setTag] = useState(initialTag);

  const posts = useMemo(() => {
    const all = getAllPosts();
    return tag ? all.filter((p) => p.tags.includes(tag)) : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, version]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tags = useMemo(() => allHashtags(), [version]);

  async function handleDelete(id) {
    await deletePost(id);
    onChange?.();
  }

  return (
    <>
      <div className="detail-scrim" onClick={onClose} />
      <aside className="detail feed" role="dialog" aria-label="Community feed">
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>Feed</h2>

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

        {posts.length === 0 ? (
          <p className="muted">
            {tag
              ? `No posts tagged #${tag} yet.`
              : 'No posts yet. Open a spot and share the first one — a photo of what you ordered, a tip, a #hashtag.'}
          </p>
        ) : (
          <div className="feed-list">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                restaurantName={nameById[p.restaurantId]}
                onTagClick={setTag}
                onDelete={handleDelete}
                onOpenRestaurant={onOpenRestaurant}
              />
            ))}
          </div>
        )}

        <p className="disclaimer">
          Posts live on this device for now. When accounts land, your posts become
          the shared community feed.
        </p>
      </aside>
    </>
  );
}
