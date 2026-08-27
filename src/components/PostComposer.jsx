import { useRef, useState } from 'react';
import { savePhoto } from '../lib/photos';
import { addPost } from '../lib/posts';

export default function PostComposer({ restaurantId, onPosted }) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setPending(true);
    try {
      let photoId = null;
      if (file) photoId = await savePhoto(restaurantId, file);
      addPost({ restaurantId, text, photoId });
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onPosted?.();
    } catch (err) {
      console.error(err);
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
      <p className="rf-note">Saved on this device for now — a shared feed is coming.</p>
    </form>
  );
}
