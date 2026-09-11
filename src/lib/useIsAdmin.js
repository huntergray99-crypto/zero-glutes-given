import { useEffect, useState } from 'react';
import { useCloud } from './CloudContext';
import { isAdminUser } from './reports';

// Whether the signed-in account is on the `admins` allowlist. Checked once
// per sign-in; the rules are the real gate, this only decides whether to show
// the admin entry point. Stores the confirmed uid rather than a bare boolean
// so switching accounts can't leave a stale "yes" behind.
export function useIsAdmin() {
  const { user, signedIn } = useCloud();
  const [adminUid, setAdminUid] = useState(null);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    isAdminUser(user.uid).then((ok) => {
      if (live && ok) setAdminUid(user.uid);
    });
    return () => {
      live = false;
    };
  }, [signedIn, user]);

  return { isAdmin: signedIn && !!user && adminUid === user.uid };
}
