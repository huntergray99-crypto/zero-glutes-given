import { useState } from 'react';

export default function ReviewForm({ onSubmit }) {
  const [rating, setRating] = useState(5);
  const [glutened, setGlutened] = useState(false);
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    onSubmit({ rating, glutened, text });
    setRating(5);
    setGlutened(false);
    setText('');
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <label className="rf-row">
        <span>Your rating</span>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          <option value={5}>★★★★★ — felt completely safe</option>
          <option value={4}>★★★★ — good, minor concerns</option>
          <option value={3}>★★★ — okay, be careful</option>
          <option value={2}>★★ — would not go back</option>
          <option value={1}>★ — bad experience</option>
        </select>
      </label>

      <label className="rf-check">
        <input
          type="checkbox"
          checked={glutened}
          onChange={(e) => setGlutened(e.target.checked)}
        />
        I got glutened here
      </label>

      <textarea
        placeholder="What did you order? How did staff handle your celiac needs?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />

      <button type="submit" className="btn">
        Post review
      </button>
      <p className="rf-note">
        Reviews are saved only in this browser, on this device.
      </p>
    </form>
  );
}
