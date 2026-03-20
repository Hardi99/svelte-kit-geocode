import { fetchIsochrone, type CostingMode } from '$lib/api/isochrone';

export const ISOCHRONE_COLORS: Record<number, string> = {
	5:  '#34d399', // emerald
	10: '#818cf8', // indigo
	15: '#f59e0b'  // amber
};

class IsochroneStore {
	open    = $state(false);
	loading = $state(false);
	error   = $state(false);
	mode    = $state<CostingMode>('pedestrian');
	data    = $state<GeoJSON.FeatureCollection | null>(null);

	toggle(): void {
		this.open = !this.open;
	}

	setMode(m: CostingMode): void {
		this.mode = m;
	}

	clear(): void {
		this.data = null;
		this.error = false;
	}

	async compute(lng: number, lat: number): Promise<void> {
		this.loading = true;
		this.error = false;
		this.data = null;

		try {
			const geojson = await fetchIsochrone(lng, lat, this.mode);
			// Sort descending so largest zone renders first (below smaller ones)
			geojson.features.sort(
				(a, b) =>
					(b.properties?.contour ?? 0) - (a.properties?.contour ?? 0)
			);
			this.data = geojson;
		} catch {
			this.error = true;
		} finally {
			this.loading = false;
		}
	}
}

export const isochroneStore = new IsochroneStore();
