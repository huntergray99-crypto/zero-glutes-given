import PhotoThumb from './PhotoThumb';

function renderText(text, onTagClick) {
  const parts = text.split(/(#[a-z0-9][a-z0-9_-]{0,30})/gi);
  return parts.map((part, i) => {
    if (/^#[a-z0-9]/i.test(part)) {
      const tag = part.slice(1).toLowerCase();
      return (
        <button
          key={i}
          className="hashtag"
          onClick={(e) => {
            e.stopPropagation();
            onTagClick?.(tag);
          }}
        >
          {part}
        </button>
      );
    }
    return part;
  });
}

export default function PostCard({
  post,
  restaurantName,
  onTagClick,
  onDelete,
  onOpenRestaurant,
}) {
  return (
    <article className="post">
      <header className="post-head">
        <span className="post-handle">@{post.handle || 'anon'}</span>
        {restaurantName ? (
          <button
            className="post-place"
            onClick={() => onOpenRestaurant?.(post.restaurantId)}
          >
            📍 {restaurantName}
          </button>
        ) : null}
        <time>{new Date(post.date).toLocaleDateString()}</time>
      </header>

      {post.photoId ? (
        <PhotoThumb photoId={post.photoId} alt="" className="post-photo" />
      ) : null}

      {post.text ? <p className="post-text">{renderText(post.text, onTagClick)}</p> : null}

      {onDelete ? (
        <button className="link-btn" onClick={() => onDelete(post.id)}>
          delete
        </button>
      ) : null}
    </article>
  );
}
