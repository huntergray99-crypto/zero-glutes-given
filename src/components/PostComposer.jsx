import { useRef, useState } from 'react';
import { savePhoto } from '../lib/photos';
import { useCloud } from '../lib/CloudContext';

export default function PostComposer({ restaurantId, onPosted }) {
  const { signedIn, isGuest, addPost } = useCloud();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setPending(true);
    setError(null);
    try {
      let photoId = null;
      if (file) photoId = await savePhoto(restaurantId, file);
      await addPost({ restaurantId, text, photoId });
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onPosted?.();
    } catch (err) {
      console.error(err);
      setError('Could not post. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        rows={2}
        placeholder="Share a tip, a photo, what you ordered… use #hashtags"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="composer-row">
        <label className="composer-photo">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? `📷 ${file.name.slice(0, 18)}` : '📷 Add photo'}
        </label>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Posting…' : 'Post'}
        </button>
      </div>
      {error ? <p className="rf-note rf-note-warn">{error}</p> : null}
      <p className="rf-note">
        {signedIn
          ? isGuest
            ? 'Posting to the shared feed as a guest. Photos sync once Storage is on.'
            : 'Posting to the shared feed. Photos sync once Storage is on.'
          : 'Saved on this device. Sign in on your card to post to the shared feed.'}
      </p>
    </form>
  );
}
