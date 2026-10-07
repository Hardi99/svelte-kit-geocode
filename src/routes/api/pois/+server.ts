import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const ALLOWED_RADII = [300, 500, 1000];

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

	if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180)
		error(400, 'Invalid coordinates');
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
