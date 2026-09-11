// One place that owns Firebase auth + the live cloud data (feed + leaderboard).
// When signed out the app still works entirely on-device (localStorage /
// IndexedDB); signing in swaps the feed over to the shared Firestore collection.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import {
  signInWithGoogle,
  signInAsGuest,
  signOutCloud,
  watchPosts,
  watchLeaderboard,
  addCloudPost,
  deleteCloudPost,
  syncUserCard,
  migrateLocalPosts,
  hasMigrated,
  currentHandle,
  setLocalHandle,
  defaultHandle,
} from './cloud';
import {
  getAllPosts as getLocalPosts,
  addPost as addLocalPost,
  deletePost as deleteLocalPost,
} from './posts';
import {
  watchCheckIns,
  saveCloudCheckIns,
  migrateLocalCheckIns,
} from './checkins';
import {
  readLocalCheckIns,
  writeLocalCheckIns,
  checkInStatus as pureCheckInStatus,
} from './profile';

const Ctx = createContext(null);

// eslint-disable-next-line react/only-export-components -- provider + its hook belong together
export function useCloud() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCloud must be used inside <CloudProvider>');
  return ctx;
}

export function CloudProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudPosts, setCloudPosts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [postsError, setPostsError] = useState(null);
  const [cloudCheckIns, setCloudCheckIns] = useState({});
  const [checkInsError, setCheckInsError] = useState(null);
  const [localVersion, setLocalVersion] = useState(0);
  const [handle, setHandleState] = useState(currentHandle());
  const [migrated, setMigrated] = useState(hasMigrated());

  const bumpLocal = useCallback(() => setLocalVersion((v) => v + 1), []);

  // auth state
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
        if (u) {
          const h = currentHandle() || defaultHandle(u);
          setLocalHandle(h);
          setHandleState(h);
        }
      }),
    []
  );

  // live feed — subscription only runs while signed in; the stale array is
  // simply not read when signed out (see `posts` below).
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react/set-state-in-effect -- resetting before (re)subscribing to an external listener
    setPostsError(null);
    return watchPosts(setCloudPosts, (err) => {
      console.error('feed listener', err);
      setPostsError(err);
    });
  }, [user]);

  // live leaderboard
  useEffect(() => {
    if (!user) return;
    return watchLeaderboard(setLeaderboard, (err) =>
      console.error('leaderboard listener', err)
    );
  }, [user]);

  // live check-ins (punch card / points source of truth while signed in)
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react/set-state-in-effect -- reset before (re)subscribing to an external listener
    setCheckInsError(null);
    return watchCheckIns(user.uid, setCloudCheckIns, (err) => {
      console.error('checkins listener', err);
      setCheckInsError(err);
    });
  }, [user]);

  const signedIn = !!user;

  // posts the UI should show: shared feed when signed in, on-device otherwise
  const posts = useMemo(() => {
    void localVersion;
    return signedIn ? cloudPosts : getLocalPosts();
  }, [signedIn, cloudPosts, localVersion]);

  const addPost = useCallback(
    async ({ restaurantId, text, photoId = null }) => {
      if (signedIn) {
        await addCloudPost({ restaurantId, text, photoId });
      } else {
        addLocalPost({ restaurantId, text, photoId });
        bumpLocal();
      }
    },
    [signedIn, bumpLocal]
  );

  const removePost = useCallback(
    async (post) => {
      if (post.cloud) await deleteCloudPost(post.id);
      else {
        await deleteLocalPost(post.id);
        bumpLocal();
      }
    },
    [bumpLocal]
  );

  // check-ins: { [restaurantId]: [{ date, verified }] } — shared cloud record
  // when signed in, on-device otherwise. Centralized here (like posts) so the
  // punch card, points, and the per-restaurant "check in" button all read the
  // same live data instead of each polling localStorage separately.
  const checkIns = useMemo(() => {
    void localVersion;
    return signedIn ? cloudCheckIns : readLocalCheckIns();
  }, [signedIn, cloudCheckIns, localVersion]);

  const getVisits = useCallback(
    (restaurantId) => checkIns[restaurantId] ?? [],
    [checkIns]
  );

  const getCheckInStatus = useCallback(
    (restaurantId, now) => pureCheckInStatus(checkIns[restaurantId] ?? [], now),
    [checkIns]
  );

  const checkIn = useCallback(
    async (restaurantId, { verified = false } = {}) => {
      const now = Date.now();
      const list = checkIns[restaurantId] ?? [];
      const status = pureCheckInStatus(list, now);
      if (!status.allowed) {
        return { ok: false, nextAllowedAt: status.nextAllowedAt };
      }
      const isFirst = list.length === 0;
      const next = [...list, { date: new Date(now).toISOString(), verified }];
      if (signedIn) {
        await saveCloudCheckIns(user.uid, restaurantId, next);
      } else {
        writeLocalCheckIns({ ...readLocalCheckIns(), [restaurantId]: next });
        bumpLocal();
      }
      return { ok: true, isFirst, count: next.length };
    },
    [signedIn, user, checkIns, bumpLocal]
  );

  const undoCheckIn = useCallback(
    async (restaurantId) => {
      const list = checkIns[restaurantId] ?? [];
      const next = list.slice(0, -1);
      if (signedIn) {
        await saveCloudCheckIns(user.uid, restaurantId, next);
      } else {
        const map = { ...readLocalCheckIns() };
        if (next.length) map[restaurantId] = next;
        else delete map[restaurantId];
        writeLocalCheckIns(map);
        bumpLocal();
      }
    },
    [signedIn, user, checkIns, bumpLocal]
  );

  const updateHandle = useCallback((h) => {
    const clean = h.slice(0, 24);
    setLocalHandle(clean);
    setHandleState(clean);
  }, []);

  const syncStats = useCallback(
    (stats) => {
      if (!signedIn) return;
      syncUserCard(stats).catch((e) => console.error('syncUserCard', e));
    },
    [signedIn]
  );

  const migrate = useCallback(async () => {
    if (!signedIn) return 0;
    const movedPosts = await migrateLocalPosts(getLocalPosts());
    const movedCheckIns = await migrateLocalCheckIns(
      user.uid,
      readLocalCheckIns()
    );
    setMigrated(true);
    return movedPosts + movedCheckIns;
  }, [signedIn, user]);

  const hasLocalCheckIns = Object.values(readLocalCheckIns()).some(
    (v) => v?.length
  );
  const needsMigration =
    signedIn && !migrated && (getLocalPosts().length > 0 || hasLocalCheckIns);

  const value = useMemo(
    () => ({
      user,
      signedIn,
      authReady,
      isGuest: !!user?.isAnonymous,
      posts,
      cloudPosts,
      postsError,
      leaderboard,
      handle,
      updateHandle,
      addPost,
      removePost,
      checkIns,
      checkInsError,
      getVisits,
      checkInStatus: getCheckInStatus,
      checkIn,
      undoCheckIn,
      syncStats,
      migrate,
      needsMigration,
      signInGoogle: signInWithGoogle,
      signInGuest: signInAsGuest,
      signOut: signOutCloud,
    }),
    [
      user,
      signedIn,
      authReady,
      posts,
      cloudPosts,
      postsError,
      leaderboard,
      handle,
      updateHandle,
      addPost,
      removePost,
      checkIns,
      checkInsError,
      getVisits,
      getCheckInStatus,
      checkIn,
      undoCheckIn,
      syncStats,
      migrate,
      needsMigration,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
