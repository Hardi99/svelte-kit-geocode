import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/* Overpass instances, tried in order until one answers */
const ENDPOINTS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.private.coffee/api/interpreter',
	'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
	'https://overpass.kumi.systems/api/interpreter'
];

const ALLOWED_RADII = [300, 500, 1000];
const TIMEOUT_MS = 8_000;

function buildQuery(lat: number, lng: number, r: number): string {
	const around = `(around:${r},${lat},${lng})`;
	return `
[out:json][timeout:8];
(
  node["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"]${around};
  node["amenity"~"^(pharmacy|hospital|doctors|dentist|clinic)$"]${around};
  node["amenity"~"^(bank|atm)$"]${around};
  node["highway"="bus_stop"]${around};
  node["railway"~"^(station|tram_stop|subway_entrance)$"]${around};
  node["shop"~"^(supermarket|convenience|bakery)$"]${around};
  node["amenity"~"^(school|university|college|kindergarten|library)$"]${around};
);
out body 200;
`.trim();
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lng = Number(url.searchParams.get('lng'));
	const radius = Number(url.searchParams.get('radius'));

	if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180)
		error(400, 'Invalid coordinates');
	if (!ALLOWED_RADII.includes(radius)) error(400, 'Invalid radius');

	const body = new URLSearchParams({ data: buildQuery(lat, lng, radius) });

	for (const endpoint of ENDPOINTS) {
		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				body,
				headers: {
					'User-Agent': 'svelte-kit-geocode (https://svelte-kit-geocode.vercel.app)',
					Accept: 'application/json'
				},
				signal: AbortSignal.timeout(TIMEOUT_MS)
			});
			if (!res.ok) continue;
			const data = await res.json();
			return json(
				{ elements: data.elements ?? [] },
				{ headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } }
			);
		} catch {
			/* timeout / network error → next instance */
		}
	}

	error(502, 'All Overpass instances failed');
};
