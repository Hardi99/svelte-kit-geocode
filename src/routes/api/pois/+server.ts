import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const ALLOWED_RADII = [300, 500, 1000];

/* Same coverage as api-adresse.data.gouv.fr: mainland France + overseas departments.
   [minLat, maxLat, minLng, maxLng] */
const FRANCE_BOUNDS: [number, number, number, number][] = [
	[41.3, 51.2, -5.3, 9.7], // Metropolitan France + Corsica
	[15.8, 16.6, -61.9, -60.9], // Guadeloupe
	[17.8, 18.2, -63.2, -62.7], // Saint-Martin, Saint-Barthélemy
	[14.3, 14.9, -61.3, -60.8], // Martinique
	[2.1, 5.8, -54.6, -51.6], // French Guiana
	[-21.4, -20.8, 55.2, 55.9], // Réunion
	[-13.1, -12.6, 44.9, 45.4], // Mayotte
	[46.7, 47.2, -56.5, -56.1] // Saint-Pierre-et-Miquelon
];

function inFrance(lat: number, lng: number): boolean {
	return FRANCE_BOUNDS.some(
		([minLat, maxLat, minLng, maxLng]) => lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
	);
}

/* One request per group, so dense categories (restaurants) can't crowd out the others.
   Explicit subcategories: broad parents ("healthcare") are several times slower on Geoapify */
const CATEGORY_GROUPS = [
	'catering.restaurant,catering.cafe,catering.fast_food,catering.bar,catering.pub',
	'healthcare.pharmacy,healthcare.hospital,healthcare.clinic_or_praxis,healthcare.dentist',
	'service.financial.bank,service.financial.atm',
	'public_transport.bus,public_transport.subway,public_transport.train,public_transport.tram',
	'commercial.supermarket,commercial.convenience,commercial.food_and_drink.bakery',
	'education.school,education.university,education.college,education.library,childcare.kindergarten'
];

const LIMIT_PER_GROUP = 40;

interface GeoapifyFeature {
	properties: {
		place_id: string;
		name?: string;
		categories: string[];
		lat: number;
		lon: number;
	};
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lng = Number(url.searchParams.get('lng'));
	const radius = Number(url.searchParams.get('radius'));

	if (!Number.isFinite(lat) || !Number.isFinite(lng)) error(400, 'Invalid coordinates');
	if (!inFrance(lat, lng)) error(400, 'Coordinates outside France');
	if (!ALLOWED_RADII.includes(radius)) error(400, 'Invalid radius');
	if (!env.GEOAPIFY_API_KEY) error(500, 'GEOAPIFY_API_KEY is not set');

	const apiKey = env.GEOAPIFY_API_KEY;

	const results = await Promise.all(
		CATEGORY_GROUPS.map(async (categories) => {
			const params = new URLSearchParams({
				categories,
				filter: `circle:${lng},${lat},${radius}`,
				bias: `proximity:${lng},${lat}`,
				limit: String(LIMIT_PER_GROUP),
				apiKey
			});
			const res = await fetch(`https://api.geoapify.com/v2/places?${params}`, {
				signal: AbortSignal.timeout(10_000)
			}).catch(() => null);
			if (!res?.ok) return null;
			return ((await res.json()) as { features: GeoapifyFeature[] }).features;
		})
	);

	/* Partial results are fine; fail only if every group failed */
	if (results.every((r) => r === null)) error(502, 'Geoapify error');

	/* A place can match several groups: keep one copy */
	const features = [
		...new Map(results.flatMap((r) => r ?? []).map((f) => [f.properties.place_id, f])).values()
	];

	return json(
		{
			places: features.map(({ properties: p }) => ({
				id: p.place_id,
				name: p.name,
				categories: p.categories,
				lat: p.lat,
				lon: p.lon
			}))
		},
		{ headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } }
	);
};
