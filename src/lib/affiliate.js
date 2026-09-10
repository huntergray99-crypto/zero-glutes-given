// Affiliate link wrapping.
//
// DoorDash and Uber both run their consumer affiliate programs through
// impact.com. Once approved you get a tracking link per program; drop it in as
// a Vite env var with the literal token {u} where the destination URL goes:
//
//   VITE_AFFIL_DOORDASH="https://doordash.pxf.io/c/PUBID/CAMPAIGN/ADID?u={u}"
//   VITE_AFFIL_UBEREATS="https://ubereats.pxf.io/c/PUBID/CAMPAIGN/ADID?u={u}"
//
// Until those are set, the raw destination URL is returned, so every link keeps
// working exactly as it does today.

const TEMPLATES = {
  doordash: import.meta.env.VITE_AFFIL_DOORDASH || '',
  ubereats: import.meta.env.VITE_AFFIL_UBEREATS || '',
};

export function affiliate(network, destUrl) {
  const t = TEMPLATES[network];
  if (!t || !t.includes('{u}')) return destUrl;
  return t.replace('{u}', encodeURIComponent(destUrl));
}

export function affiliateActive(network) {
  const t = TEMPLATES[network];
  return Boolean(t && t.includes('{u}'));
}
