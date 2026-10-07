import type { POICategory } from '$lib/stores/poisStore.svelte';

interface RawPlace {
	id: string;
	name?: string;
	categories: string[];
	lat: number;
	lon: number;
}

export interface POIFeature {
	id: string;
	name?: string;
	category: POICategory;
	coordinates: [number, number];
}

/* Maps Geoapify category keys (e.g. "catering.cafe") to our categories */
function detectCategory(categories: string[]): POICategory | null {
	const has = (prefix: string) => categories.some((c) => c === prefix || c.startsWith(`${prefix}.`));

	if (has('catering')) return 'food';
	if (has('healthcare') || has('commercial.health_and_beauty.pharmacy')) return 'health';
	if (has('service.financial')) return 'bank';
	if (has('public_transport')) return 'transport';
	if (has('commercial.supermarket') || has('commercial.convenience') || has('commercial.food_and_drink'))
		return 'shopping';
	if (has('education') || has('childcare')) return 'education';

	return null;
}

export async function fetchPOIs(
	lng: number,
	lat: number,
	radius: number,
	signal?: AbortSignal
): Promise<POIFeature[]> {
	/* Proxied through our server route, which holds the Geoapify API key */
	const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
	const res = await fetch(`/api/pois?${params}`, { signal });

	if (!res.ok) throw new Error(`POI error: ${res.status}`);
	const json = (await res.json()) as { places: RawPlace[] };

	return json.places
		.map((p) => {
			const category = detectCategory(p.categories);
			if (!category) return null;
			return {
				id: p.id,
				name: p.name,
				category,
				coordinates: [p.lon, p.lat] as [number, number]
			};
		})
		.filter(Boolean) as POIFeature[];
}
