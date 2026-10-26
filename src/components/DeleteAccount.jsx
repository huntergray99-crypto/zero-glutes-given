import { useState } from 'react';
import { deleteAccount } from '../lib/account';
import { useCloud } from '../lib/CloudContext';

// What went wrong, in words a person can act on. The first two mean the user
// backed out, so nothing was deleted — say that, because "Delete failed" about
// an action they cancelled themselves reads as data loss.
function messageFor(e) {
  switch (e?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Cancelled — nothing was deleted.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Allow popups, then try again — nothing was deleted.';
    case 'auth/user-mismatch':
      return 'That was a different Google account. Pick the one you’re signed in with — nothing was deleted.';
    case 'auth/requires-recent-login':
      return 'For security, sign out and back in, then try again.';
    default:
      return 'Something went wrong and your account wasn’t fully deleted. Try again — it picks up where it left off.';
  }
}

// Two steps on purpose: a quiet link, then an explicit confirm that lists what
// goes. Both app stores require deletion to be possible in-app (see
// lib/account.js); neither wants it to be one stray tap.
export default function DeleteAccount() {
  const { isGuest } = useCloud();
  const [step, setStep] = useState('idle'); // idle | confirm | working
  const [error, setError] = useState(null);

  // Must call deleteAccount() straight from this click handler — for Google
  // accounts it opens a re-authentication popup, which browsers block unless
  // it follows a user gesture.
  async function confirmDelete() {
    setStep('working');
    setError(null);
    try {
      await deleteAccount();
      // Success signs the user out, which unmounts this — no state to set.
    } catch (e) {
      console.error('deleteAccount', e);
      setError(messageFor(e));
      setStep('confirm');
    }
  }

  if (step === 'idle') {
    return (
      <div className="delete-account">
        <button
          type="button"
          className="delete-link"
          onClick={() => {
            setError(null);
            setStep('confirm');
          }}
        >
          Delete my account
        </button>
        {error ? <p className="rf-note rf-note-warn">{error}</p> : null}
      </div>
    );
  }

  const working = step === 'working';
  return (
    <div className="delete-account" role="alertdialog" aria-label="Delete your account">
      <p>
        <strong>Delete your {isGuest ? 'guest ' : ''}account?</strong> This permanently removes
        your posts, comments, reviews, check-in history, reports and leaderboard card from the
        cloud, and deletes your sign-in. It can’t be undone. Anything saved only on this device
        stays here — clear it in your browser settings.
      </p>
      {!isGuest && !working ? (
        <p className="muted">You’ll be asked to confirm your Google account first.</p>
      ) : null}
      <div className="account-btns">
        <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={working}>
          {working ? 'Deleting…' : 'Yes, delete everything'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setStep('idle')}
          disabled={working}
        >
          Keep my account
        </button>
      </div>
      {error ? <p className="rf-note rf-note-warn">{error}</p> : null}
    </div>
  );
}
