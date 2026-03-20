import type { AddressFeature } from '$lib/types';

const BASE = 'https://api-adresse.data.gouv.fr';

export async function searchAddress(query: string): Promise<AddressFeature[]> {
	if (query.length < 3 || query.length > 200) return [];

	const url = `${BASE}/search/?q=${encodeURIComponent(query)}&type=housenumber&limit=7`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`API error: ${res.status}`);

	const data = await res.json();
	return data.features as AddressFeature[];
}

export async function reverseGeocode(
	lng: number,
	lat: number
): Promise<AddressFeature | null> {
	const url = `${BASE}/reverse/?lon=${lng}&lat=${lat}`;
	const res = await fetch(url);
	if (!res.ok) return null;

	const data = await res.json();
	return (data.features[0] as AddressFeature) ?? null;
}
