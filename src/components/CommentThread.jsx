import { useState } from 'react';
import { useComments } from '../lib/useComments';

export default function CommentThread({ restaurantId }) {
  const { comments, add, remove, error, uid, signedIn } = useComments(restaurantId);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await add(text);
      setText('');
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="detail-block">
      <h3>
        Community notes{' '}
        <span className="muted">— {comments.length || 'none yet'}</span>
      </h3>
      <p className="rf-note">
        Quick tips and questions — “still safe as of last week?”, “ask for Dana”.
        Not full reviews.
      </p>

      {error ? (
        <p className="rf-note rf-note-warn">
          Notes didn’t load — the database rules may need the new{' '}
          <code>comments</code> block published.
        </p>
      ) : null}

      {comments.length ? (
        <ul className="note-list">
          {comments.map((c) => (
            <li key={c.id} className="note">
              <div className="note-head">
                <span className="note-handle">@{c.handle || 'anon'}</span>
                <time>
                  {c.pending ? 'just now' : new Date(c.date).toLocaleDateString()}
                </time>
              </div>
              <p>{c.text}</p>
              {!c.cloud || c.uid === uid ? (
                <button className="link-btn" onClick={() => remove(c)}>
                  delete
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form className="note-form" onSubmit={submit}>
        <textarea
          rows={2}
          value={text}
          maxLength={1000}
          placeholder="Add a note…"
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn" type="submit" disabled={busy || !text.trim()}>
          {busy ? 'Posting…' : 'Post note'}
        </button>
      </form>
      <p className="rf-note">
        {signedIn
          ? 'Posted to the shared thread.'
          : 'Saved on this device — sign in on your card to post to the shared thread.'}
      </p>
    </div>
  );
}
