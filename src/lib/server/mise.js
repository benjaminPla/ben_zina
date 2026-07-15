import 'server-only';

// Server-only client for the public MISE "OsservaPrezzi Carburanti" API
// (https://carburanti.mise.gov.it). No auth required for /search/* or
// /registry/* — only /management/* (the private portal) needs a Bearer
// token, which we never touch here.
//
// This file is only ever imported from route.js Route Handlers, so it's
// safe to call the MISE API directly from here: browsers can't reach this
// code, and server-to-server requests aren't subject to the browser CORS
// restriction that blocks calling the MISE API straight from client-side JS
// (confirmed via a live preflight test: OPTIONS against /search/area
// returns "403 Invalid CORS request" with no Access-Control-Allow-Origin
// header). The `server-only` import above turns any accidental client-side
// import of this file into a build-time error.
//
// /search/zone (NOT implemented/confirmed) — best-guess shape based on the
// private portal's main.js: POST { "points": [ {"lat":.., "lng":..}, ... ] }
// describing a drawn circle/polygon (a circle gets tessellated into points
// client-side before sending). Every multi-point body tried during testing
// returned {"success": false}; single-point bodies "succeed" but return a
// hardcoded default center + empty results. Exact validation rules (closed
// ring? winding order? min/max vertices? a different field name?) are
// unconfirmed — revisit with a browser devtools capture on the live site if
// you want this later. /search/area (used below) covers "find near me" fine.

import { REGIONS } from './regions';

const BASE = 'https://carburanti.mise.gov.it/ospzApi';

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(a, b) {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const lat1 = (a.lat * Math.PI) / 180;
	const lat2 = (b.lat * Math.PI) / 180;

	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/** Picks the region whose (approximate) centroid is closest to the given point. */
export function nearestRegion(point) {
	let best = REGIONS[0];
	let bestDist = Infinity;
	for (const region of REGIONS) {
		const dist = haversineKm(point, { lat: region.lat, lng: region.lng });
		if (dist < bestDist) {
			bestDist = dist;
			best = region;
		}
	}
	return best;
}

export async function searchArea(params) {
	const body = { region: params.region };
	if (params.province) body.province = params.province;
	if (params.town) body.town = params.town;

	const res = await fetch(`${BASE}/search/area`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		throw new Error(`MISE search/area failed: ${res.status} ${res.statusText}`);
	}

	return res.json();
}
