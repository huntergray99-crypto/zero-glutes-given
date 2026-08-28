import { useState } from 'react';
import { submitReport } from '../lib/reports';

// "Suggest a spot" — a collapsed link that opens a small form. Used from the
// profile and the empty list state.
export default function SuggestSpot({ label = 'Suggest a spot' }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [state, setState] = useState('idle');

  async function submit(e) {
    e.preventDefault();
    if (state === 'sending' || !name.trim()) return;
    setState('sending');
    try {
      await submitReport({
        type: 'new-spot',
        restaurantName: name,
        text,
      });
      setState('sent');
    } catch (err) {
      console.error(err);
      setState('error');
    }
  }

  if (state === 'sent') {
    return <p className="rf-note report-thanks">Got it — thanks for the tip.</p>;
  }

  if (!open) {
    return (
      <button className="link-btn report-link" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <form className="report-form" onSubmit={submit}>
      <input
        value={name}
        maxLength={200}
        placeholder="Restaurant name + neighborhood"
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        rows={2}
        value={text}
        maxLength={2000}
        placeholder="Why is it celiac-safe? Dedicated fryer, GF menu, a link…"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="report-actions">
        <button className="btn" type="submit" disabled={state === 'sending' || !name.trim()}>
          {state === 'sending' ? 'Sending…' : 'Send suggestion'}
        </button>
        <button type="button" className="link-btn" onClick={() => setOpen(false)}>
          cancel
        </button>
      </div>
      {state === 'error' ? (
        <p className="rf-note rf-note-warn">Couldn’t send — try again.</p>
      ) : null}
    </form>
  );
}
