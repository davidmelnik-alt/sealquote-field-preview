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
// Enrich a Census street-range match only when a single nearby site has the
// same complete street address. Duplicate house numbers can span municipalities.
export async function refineCountyPoint(match, request = fetch) {
  if (!/, PA,/.test(match.address) || match.lng < -75.55 || match.lng > -74.65 ||
      match.lat < 41.05 || match.lat > 41.65) return match;
  const street = match.address.split(',')[0].trim().toUpperCase();
  const number = street.match(/^(\d{1,8}) /)?.[1];
  if (!number) return match;
  const url = new URL('https://gis.pikepa.org/arcgis/rest/services/PikeCo_AddressPoints/MapServer/0/query');
  url.search = new URLSearchParams({
    where: "Add_Number=" + number + " AND UPPER(PrimaryAddress)='" + street.replaceAll("'", "''") + "'",
    outFields: 'PrimaryAddress', outSR: '4326', returnGeometry: 'true', f: 'json'
  }).toString();
  try {
    const response = await request(url, {signal: AbortSignal.timeout(4500)});
    if (!response.ok) return match;
    const data = await response.json();
    if (data.exceededTransferLimit || data.features?.length !== 1) return match;
    const {geometry, attributes} = data.features[0];
    if (attributes?.PrimaryAddress?.trim().toUpperCase() !== street ||
        !Number.isFinite(geometry?.x) || !Number.isFinite(geometry?.y)) return match;
    const meters = 111320 * Math.hypot(geometry.y-match.lat,
      (geometry.x-match.lng)*Math.cos(match.lat*Math.PI/180));
    if (meters > 2000) return match;
    return {...match, lat:geometry.y, lng:geometry.x, source:'Pike County address point'};
  } catch { return match; }
}

export async function lookupAddress(address, zip = '') {
  const query = withZip(address, zip);
  if(query.length<8 || query.length>250) throw new Error('Enter a full street address, city and state.');
  const {matches} = await browserCensus(query);
  return {matches: await Promise.all(matches.map(match => refineCountyPoint(match)))};
}
