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
	radius: number
): Promise<POIFeature[]> {
	const r = radius;
	const query = `
[out:json][timeout:20];
(
  node["amenity"~"restaurant|cafe|fast_food|bar|pub"](around:${r},${lat},${lng});
  node["amenity"~"pharmacy|hospital|doctors|dentist|clinic"](around:${r},${lat},${lng});
  node["amenity"="bank"](around:${r},${lat},${lng});
  node["amenity"="atm"](around:${r},${lat},${lng});
  node["highway"="bus_stop"](around:${r},${lat},${lng});
  node["railway"~"station|tram_stop|subway_entrance"](around:${r},${lat},${lng});
  node["shop"~"supermarket|convenience|bakery"](around:${r},${lat},${lng});
  node["amenity"~"school|university|college|kindergarten|library"](around:${r},${lat},${lng});
);
out body 200;
`.trim();

	const res = await fetch('https://overpass-api.de/api/interpreter', {
		method: 'POST',
		body: query
	});

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
