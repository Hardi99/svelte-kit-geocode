import { fetchPOIs, type POIFeature } from '$lib/api/overpass';

export type POICategory = 'food' | 'health' | 'bank' | 'transport' | 'shopping' | 'education';

export const POI_CATEGORIES: Record<POICategory, {
	label: { fr: string; en: string };
	color: string;
	emoji: string;
}> = {
	food:      { label: { fr: 'Restauration', en: 'Food & Drink' }, color: '#f97316', emoji: '🍽️' },
	health:    { label: { fr: 'Santé',        en: 'Health'       }, color: '#22c55e', emoji: '🏥' },
	bank:      { label: { fr: 'Banque',       en: 'Finance'      }, color: '#3b82f6', emoji: '🏦' },
	transport: { label: { fr: 'Transport',    en: 'Transport'    }, color: '#a855f7', emoji: '🚌' },
	shopping:  { label: { fr: 'Commerce',     en: 'Shopping'     }, color: '#eab308', emoji: '🛒' },
	education: { label: { fr: 'Éducation',    en: 'Education'    }, color: '#06b6d4', emoji: '🎓' }
};

export const RADIUS_OPTIONS = [300, 500, 1000] as const;
export type RadiusOption = typeof RADIUS_OPTIONS[number];

/* Converts POI array → GeoJSON FeatureCollection for MapLibre */
export function toPOIGeoJSON(pois: POIFeature[]): GeoJSON.FeatureCollection {
	return {
		type: 'FeatureCollection',
		features: pois.map((p) => ({
			type: 'Feature',
			properties: {
				id: p.id,
				name: p.name,
				category: p.category,
				color: POI_CATEGORIES[p.category].color
			},
			geometry: { type: 'Point', coordinates: p.coordinates }
		}))
	};
}

class POIStore {
	open               = $state(false);
	loading            = $state(false);
	error              = $state(false);
	radius             = $state<RadiusOption>(500);
	pois               = $state<POIFeature[]>([]);
	visibleCategories  = $state<POICategory[]>(Object.keys(POI_CATEGORIES) as POICategory[]);

	/* Counts per category */
	get counts(): Record<POICategory, number> {
		const c = {} as Record<POICategory, number>;
		for (const key of Object.keys(POI_CATEGORIES) as POICategory[]) c[key] = 0;
		for (const p of this.pois) c[p.category]++;
		return c;
	}

	/* GeoJSON filtered by visible categories */
	get geojson(): GeoJSON.FeatureCollection {
		return toPOIGeoJSON(
			this.pois.filter((p) => this.visibleCategories.includes(p.category))
		);
	}

	toggle(): void { this.open = !this.open; }

	setRadius(r: RadiusOption): void { this.radius = r; }

	toggleCategory(id: POICategory): void {
		if (this.visibleCategories.includes(id)) {
			this.visibleCategories = this.visibleCategories.filter((c) => c !== id);
		} else {
			this.visibleCategories = [...this.visibleCategories, id];
		}
	}

	clear(): void {
		this.pois = [];
		this.error = false;
	}

	async compute(lng: number, lat: number): Promise<void> {
		this.loading = true;
		this.error = false;
		this.pois = [];

		try {
			this.pois = await fetchPOIs(lng, lat, this.radius);
		} catch {
			this.error = true;
		} finally {
			this.loading = false;
		}
	}
}

export const poisStore = new POIStore();
