export interface AddressProperties {
	label: string;
	name: string;
	postcode: string;
	city: string;
	context: string;
	score: number;
	type: string;
	housenumber?: string;
	street?: string;
	citycode?: string;
	x?: number;
	y?: number;
}

export interface AddressFeature {
	type: 'Feature';
	properties: AddressProperties;
	geometry: {
		type: 'Point';
		coordinates: [number, number]; // [lng, lat]
	};
}

export interface SelectedAddress {
	label: string;
	name: string;
	postcode: string;
	city: string;
	context: string;
	coordinates: [number, number];
	timestamp: number;
}

export type Lang = 'fr' | 'en';
