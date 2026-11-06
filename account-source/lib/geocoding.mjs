// Census documents JSONP for browser requests (its API does not support CORS).
// Keep the provider fixed: never execute a caller-supplied script URL.
export function normalizeMatches(data) {
  const rows = data?.result?.addressMatches;
  if (!Array.isArray(rows)) throw new Error('Invalid address lookup response.');
  return rows.filter(m => typeof m.matchedAddress === 'string' && Number.isFinite(m.coordinates?.y) && Number.isFinite(m.coordinates?.x) && m.coordinates.y >= 24 && m.coordinates.y <= 50 && m.coordinates.x >= -125 && m.coordinates.x <= -66).slice(0, 5).map(m => ({address:m.matchedAddress, lat:m.coordinates.y, lng:m.coordinates.x}));
}
export function withZip(address, zip = '') {
  const clean = address.trim();
  return /^\d{5}$/.test(zip) && !/\b\d{5}(?:-\d{4})?\s*$/.test(clean) ? `${clean}, ${zip}` : clean;
}
export function browserCensus(address, {doc = document, target = window, timeout = 15000} = {}) {
  return new Promise((resolve, reject) => {
    const callback = 'sealquoteCensus_' + crypto.randomUUID().replaceAll('-', '');
    const script = doc.createElement('script');
    const cleanup = () => { clearTimeout(timer); script.remove(); delete target[callback]; };
    const fail = () => { cleanup(); reject(new Error('The address service could not be reached. Please retry, or enter a measured area.')); };
    const timer = setTimeout(fail, timeout);
    target[callback] = data => { try { const matches = normalizeMatches(data); cleanup(); resolve({matches}); } catch { fail(); } };
    const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
    url.search = new URLSearchParams({address, benchmark:'Public_AR_Current', format:'jsonp', callback}).toString();
    script.src = url.toString(); script.async = true; script.referrerPolicy = 'no-referrer'; script.onerror = fail;
    doc.head.appendChild(script);
  });
}
export async function lookupAddress(address, zip = '', {request = fetch, fallback = browserCensus} = {}) {
  const query = withZip(address, zip);
  if (query.length < 8 || query.length > 250) throw new Error('Enter a full U.S. street address, city, state and ZIP.');
  let response;
  try {
    response = await request('/api/locate', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({address:query}), signal:AbortSignal.timeout(6000)});
  } catch { return fallback(query); }
  if (response.status >= 500) return fallback(query);
  if (!response.ok) throw new Error('Check the address and refresh the page before trying again.');
  try {
    const data = await response.json();
    if (!Array.isArray(data.matches)) throw new Error('Invalid response');
    return data;
  } catch { return fallback(query); }
}
