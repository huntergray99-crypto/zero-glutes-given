import { useState } from 'react';
import { submitReport, CHANGE_TYPES } from '../lib/reports';

// "Report a change" for a specific restaurant — a collapsed link that opens a
// small form.
export default function ReportChange({ restaurant }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(CHANGE_TYPES[0].value);
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error

  async function submit(e) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      await submitReport({
        type,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        text,
      });
      setState('sent');
    } catch (err) {
      console.error(err);
      setState('error');
    }
  }

  if (state === 'sent') {
    return <p className="rf-note report-thanks">Thanks — we’ll check it out.</p>;
  }

  if (!open) {
    return (
      <button className="link-btn report-link" onClick={() => setOpen(true)}>
        Report a change (closed, moved, safety info…)
      </button>
    );
  }

  return (
    <form className="report-form" onSubmit={submit}>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {CHANGE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <textarea
        rows={2}
        value={text}
        maxLength={2000}
        placeholder="What changed? (optional)"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="report-actions">
        <button className="btn" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send report'}
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => setOpen(false)}
        >
          cancel
        </button>
      </div>
      {state === 'error' ? (
        <p className="rf-note rf-note-warn">Couldn’t send — try again.</p>
      ) : null}
    </form>
  );
}
