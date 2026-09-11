import { useCallback, useEffect, useState } from 'react';
import { useCloud } from './CloudContext';
import {
  watchReviews,
  addCloudReview,
  deleteCloudReview,
  getReviews as localReviews,
  addReview as addLocalReview,
  deleteReview as deleteLocalReview,
} from './reviews';

// Celiac safety reviews for one restaurant. Subscribes to the shared cloud
// thread while signed in; falls back to on-device reviews otherwise — same
// shape as useComments.
export function useReviews(restaurantId) {
  const { signedIn, user } = useCloud();
  const [cloud, setCloud] = useState([]);
  const [localVersion, setLocalVersion] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!signedIn || !restaurantId) return;
    // eslint-disable-next-line react/set-state-in-effect -- reset before (re)subscribing to an external listener
    setError(null);
    return watchReviews(restaurantId, setCloud, (e) => {
      console.error('reviews listener', e);
      setError(e);
    });
  }, [signedIn, restaurantId]);

  void localVersion;
  const reviews = signedIn ? cloud : localReviews(restaurantId);

  const add = useCallback(
    async (payload) => {
      if (signedIn) await addCloudReview(restaurantId, payload);
      else {
        addLocalReview(restaurantId, payload);
        setLocalVersion((v) => v + 1);
      }
    },
    [signedIn, restaurantId]
  );

  const remove = useCallback(
    async (r) => {
      if (r.cloud) await deleteCloudReview(r.id);
      else {
        deleteLocalReview(restaurantId, r.id);
        setLocalVersion((v) => v + 1);
      }
    },
    [restaurantId]
  );

  return { reviews, add, remove, error, uid: user?.uid, signedIn };
}
