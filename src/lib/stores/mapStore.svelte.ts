import type { Map as MaplibreMap } from 'maplibre-gl';

let _map: MaplibreMap | null = null;

export function setMap(m: MaplibreMap): void { _map = m; }
export function getMap(): MaplibreMap | null { return _map; }

class MapStore {
	markerCoords = $state<[number, number] | null>(null);
	isReverseMode = $state(false);
	mapLoaded = $state(false);

	flyTo(coords: [number, number]): void {
		this.markerCoords = coords;
		_map?.flyTo({
			center: coords,
			zoom: 16,
			duration: 1400,
			curve: 1.4,
			essential: true
		});
	}

	toggleReverseMode(): void {
		this.isReverseMode = !this.isReverseMode;
	}

	setMapLoaded(v: boolean): void {
		this.mapLoaded = v;
	}
}

export const mapStore = new MapStore();
