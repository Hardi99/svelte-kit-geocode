import { POI_CATEGORIES, type POICategory } from '$lib/stores/poisStore.svelte';

export interface RawNode {
	id: number;
	lat: number;
	lon: number;
	tags?: Record<string, string>;
}

export interface POIFeature {
	id: number;
	name: string;
	category: POICategory;
	coordinates: [number, number];
}

function detectCategory(tags: Record<string, string>): POICategory | null {
	const { amenity, highway, railway, shop } = tags;

	if (amenity && ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food_court'].includes(amenity))
		return 'food';
	if (amenity && ['pharmacy', 'hospital', 'doctors', 'dentist', 'clinic'].includes(amenity))
		return 'health';
	if (amenity === 'bank' || amenity === 'atm')
		return 'bank';
	if (highway === 'bus_stop' || railway === 'station' || railway === 'tram_stop' || railway === 'subway_entrance')
		return 'transport';
	if (shop && ['supermarket', 'convenience', 'bakery', 'butcher', 'greengrocer', 'mall'].includes(shop))
		return 'shopping';
	if (amenity && ['school', 'university', 'college', 'kindergarten', 'library'].includes(amenity))
		return 'education';

	return null;
}

export async function fetchPOIs(
	lng: number,
	lat: number,
	radius: number,
	signal?: AbortSignal
): Promise<POIFeature[]> {
	/* Proxied through our server route: avoids CORS issues and lets the
	   server fall back to other Overpass instances */
	const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
	const res = await fetch(`/api/pois?${params}`, { signal });

	if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
	const json = await res.json();

	return (json.elements as RawNode[])
		.filter((el) => el.tags)
		.map((el) => {
			const tags = el.tags!;
			const category = detectCategory(tags);
			if (!category) return null;
			return {
				id: el.id,
				name: tags.name || POI_CATEGORIES[category].label.fr,
				category,
				coordinates: [el.lon, el.lat] as [number, number]
			};
		})
		.filter(Boolean) as POIFeature[];
}
