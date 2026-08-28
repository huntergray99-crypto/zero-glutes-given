// Community corrections: "this place closed", "safety info is wrong", or a new
// spot to add. Writes to a private Firestore `reports` collection that only the
// admin reads (via the console). Auth optional — low friction on purpose.

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

const REPORTS = collection(db, 'reports');

export const CHANGE_TYPES = [
  { value: 'closed', label: 'Permanently closed' },
  { value: 'moved', label: 'Moved / wrong address' },
  { value: 'safety', label: 'Safety info is wrong' },
  { value: 'hours', label: 'Hours are wrong' },
  { value: 'other', label: 'Something else' },
];

export async function submitReport({
  type,
  restaurantId = null,
  restaurantName = '',
  text = '',
}) {
  await addDoc(REPORTS, {
    type,
    restaurantId,
    restaurantName: restaurantName.slice(0, 200),
    text: text.trim().slice(0, 2000),
    uid: auth.currentUser?.uid ?? null,
    handle: (() => {
      try {
        return localStorage.getItem('zgg.handle') || null;
      } catch {
        return null;
      }
    })(),
    status: 'open',
    createdAt: serverTimestamp(),
  });
}
