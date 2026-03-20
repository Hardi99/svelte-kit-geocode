export type CostingMode = 'pedestrian' | 'bicycle' | 'auto';

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/isochrone';
const CONTOUR_TIMES = [5, 10, 15];

export async function fetchIsochrone(
	lng: number,
	lat: number,
	mode: CostingMode
): Promise<GeoJSON.FeatureCollection> {
	const body = {
		locations: [{ lon: lng, lat }],
		costing: mode,
		contours: CONTOUR_TIMES.map((time) => ({ time })),
		polygons: true,
		denoise: 0.5,
		generalize: 150
	};

	const res = await fetch(VALHALLA_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) throw new Error(`Isochrone API error: ${res.status}`);
	return res.json();
}
