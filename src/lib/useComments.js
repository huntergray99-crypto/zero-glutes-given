import { useCallback, useEffect, useState } from 'react';
import { useCloud } from './CloudContext';
import {
  watchComments,
  addCloudComment,
  deleteCloudComment,
  localComments,
  addLocalComment,
  deleteLocalComment,
} from './comments';

// Community-notes thread for one restaurant. Subscribes to the cloud thread
// while signed in; falls back to on-device notes otherwise.
export function useComments(restaurantId) {
  const { signedIn, user } = useCloud();
  const [cloud, setCloud] = useState([]);
  const [localVersion, setLocalVersion] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!signedIn) return;
    // eslint-disable-next-line react/set-state-in-effect -- reset before (re)subscribing to an external listener
    setError(null);
    return watchComments(restaurantId, setCloud, (e) => {
      console.error('comments listener', e);
      setError(e);
    });
  }, [signedIn, restaurantId]);

  void localVersion;
  const comments = signedIn ? cloud : localComments(restaurantId);

  const add = useCallback(
    async (text) => {
      if (!text.trim()) return;
      if (signedIn) await addCloudComment(restaurantId, text);
      else {
        addLocalComment(restaurantId, text);
        setLocalVersion((v) => v + 1);
      }
    },
    [signedIn, restaurantId]
  );

  const remove = useCallback(
    async (c) => {
      if (c.cloud) await deleteCloudComment(c.id);
      else {
        deleteLocalComment(restaurantId, c.id);
        setLocalVersion((v) => v + 1);
      }
    },
    [restaurantId]
  );

  return { comments, add, remove, error, uid: user?.uid, signedIn };
}
