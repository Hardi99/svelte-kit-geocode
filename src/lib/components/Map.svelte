<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { PUBLIC_MAPTILER_KEY } from '$env/static/public';
	import { setMap, mapStore } from '$lib/stores/mapStore.svelte';
	import { reverseGeocode } from '$lib/api/adresse';
	import { searchStore } from '$lib/stores/searchStore.svelte';
	import { isochroneStore, ISOCHRONE_COLORS } from '$lib/stores/isochroneStore.svelte';
	import { poisStore } from '$lib/stores/poisStore.svelte';

	interface Props {
		onReverseResult?: (label: string) => void;
	}
	let { onReverseResult }: Props = $props();

	let container: HTMLDivElement;
	let map: maplibregl.Map;
	let marker: maplibregl.Marker;
	let pulseEl: HTMLDivElement;

	/* ── Custom pulsing marker element ─────────────────── */
	function createPulseMarker(): HTMLDivElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'pulse-marker';
		wrapper.innerHTML = `
			<div class="pulse-ring"></div>
			<div class="pulse-dot"></div>
		`;
		return wrapper;
	}

	onMount(() => {
		map = new maplibregl.Map({
			container,
			style: `https://api.maptiler.com/maps/dataviz/style.json?key=${PUBLIC_MAPTILER_KEY}`,
			center: [2.3522, 48.8566],
			zoom: 12,
			attributionControl: false
		});

		map.addControl(
			new maplibregl.AttributionControl({ compact: true }),
			'bottom-right'
		);
		map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

		map.on('load', () => {
			mapStore.setMapLoaded(true);

			/* ── Isochrone layers ───────────────────────── */
			const emptyCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

			// Find first symbol layer to insert below labels
			const firstSymbolId = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;

			map.addSource('isochrone', { type: 'geojson', data: emptyCollection });

			const colorExpr: maplibregl.ExpressionSpecification = [
				'match', ['get', 'contour'],
				5,  ISOCHRONE_COLORS[5],
				10, ISOCHRONE_COLORS[10],
				15, ISOCHRONE_COLORS[15],
				'#ffffff'
			];

			map.addLayer({
				id: 'isochrone-fill',
				type: 'fill',
				source: 'isochrone',
				paint: {
					'fill-color': colorExpr,
					'fill-opacity': 0,
					'fill-opacity-transition': { duration: 600, delay: 0 }
				}
			}, firstSymbolId);

			/* ── POI layers ─────────────────────────────── */
			const emptyPOI: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
			map.addSource('poi', { type: 'geojson', data: emptyPOI });

			map.addLayer({
				id: 'poi-circles',
				type: 'circle',
				source: 'poi',
				paint: {
					'circle-color': ['get', 'color'],
					'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 15, 7, 18, 10],
					'circle-opacity': 0.9,
					'circle-stroke-width': 1.5,
					'circle-stroke-color': '#ffffff',
					'circle-stroke-opacity': 0.6
				}
			});

			/* ── POI hover popup ─────────────────────── */
			const popup = new maplibregl.Popup({
				closeButton: false,
				closeOnClick: false,
				className: 'poi-popup',
				offset: 10
			});

			map.on('mouseenter', 'poi-circles', (e) => {
				map.getCanvas().style.cursor = 'pointer';
				const f = e.features?.[0];
				if (!f) return;
				popup
					.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
					.setHTML(`<span>${f.properties?.name ?? 'POI'}</span>`)
					.addTo(map);
			});

			map.on('mouseleave', 'poi-circles', () => {
				map.getCanvas().style.cursor = '';
				popup.remove();
			});

			map.addLayer({
				id: 'isochrone-line',
				type: 'line',
				source: 'isochrone',
				paint: {
					'line-color': colorExpr,
					'line-width': 1.5,
					'line-opacity': 0,
					'line-opacity-transition': { duration: 600, delay: 0 }
				}
			}, firstSymbolId);
		});

		/* ── Reverse geocoding on click ─────────────────── */
		map.on('click', async (e) => {
			if (!mapStore.isReverseMode) return;
			const { lng, lat } = e.lngLat;
			const feature = await reverseGeocode(lng, lat);
			if (!feature) return;

			mapStore.flyTo([lng, lat]);

			const addr = {
				label: feature.properties.label,
				name: feature.properties.name,
				postcode: feature.properties.postcode,
				city: feature.properties.city,
				context: feature.properties.context,
				coordinates: [lng, lat] as [number, number],
				timestamp: Date.now()
			};
			searchStore.setSelectedAddress(addr);
			onReverseResult?.(feature.properties.label);
		});

		/* ── Cursor style in reverse mode ───────────────── */
		map.on('mousemove', () => {
			map.getCanvas().style.cursor = mapStore.isReverseMode ? 'crosshair' : '';
		});

		pulseEl = createPulseMarker();
		marker = new maplibregl.Marker({ element: pulseEl, anchor: 'center' });
		setMap(map);
	});

	onDestroy(() => {
		map?.remove();
	});

	/* ── Sync marker to store ───────────────────────────── */
	$effect(() => {
		if (mapStore.markerCoords && map) {
			marker.setLngLat(mapStore.markerCoords).addTo(map);
		}
	});

	/* ── Sync POI data + category filter ───────────────── */
	$effect(() => {
		const geojson = poisStore.geojson; // reactive to pois + visibleCategories
		if (!map || !mapStore.mapLoaded) return;
		const source = map.getSource('poi') as maplibregl.GeoJSONSource;
		source?.setData(geojson);
	});

	/* ── Sync isochrone data to map layers ──────────────── */
	$effect(() => {
		const data = isochroneStore.data;
		if (!map || !mapStore.mapLoaded) return;

		const source = map.getSource('isochrone') as maplibregl.GeoJSONSource;
		if (!source) return;

		if (data) {
			source.setData(data);
			// Fade in after data is set
			setTimeout(() => {
				map.setPaintProperty('isochrone-fill', 'fill-opacity',
					['match', ['get', 'contour'], 5, 0.32, 10, 0.22, 15, 0.14, 0]
				);
				map.setPaintProperty('isochrone-line', 'line-opacity',
					['match', ['get', 'contour'], 5, 0.9, 10, 0.75, 15, 0.6, 0]
				);
			}, 50);
		} else {
			source.setData({ type: 'FeatureCollection', features: [] });
			map.setPaintProperty('isochrone-fill', 'fill-opacity', 0);
			map.setPaintProperty('isochrone-line', 'line-opacity', 0);
		}
	});
</script>

<div bind:this={container} class="map-container"></div>

<style>
	.map-container {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* ── POI Popup ──────────────────────────────────── */
	:global(.poi-popup .maplibregl-popup-content) {
		background: #111111;
		color: #f5f5f5;
		border: 1px solid #2a2a2a;
		border-radius: 6px;
		padding: 5px 10px;
		font-size: 12px;
		font-family: 'Inter', sans-serif;
		box-shadow: 0 4px 16px rgba(0,0,0,0.6);
	}
	:global(.poi-popup .maplibregl-popup-tip) {
		border-top-color: #111111 !important;
		border-bottom-color: #111111 !important;
	}

	/* MapLibre attribution compact */
	:global(.maplibregl-ctrl-attrib) {
		background: rgba(10, 10, 10, 0.7) !important;
		color: #6b6b6b !important;
		font-size: 10px !important;
	}
	:global(.maplibregl-ctrl-attrib a) {
		color: #818cf8 !important;
	}

	/* Navigation controls */
	:global(.maplibregl-ctrl-group) {
		background: #111111 !important;
		border: 1px solid #252525 !important;
		box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
	}
	:global(.maplibregl-ctrl-group button) {
		background: transparent !important;
		color: #f5f5f5 !important;
		border-bottom-color: #252525 !important;
	}
	:global(.maplibregl-ctrl-group button:hover) {
		background: #1a1a1a !important;
	}
	:global(.maplibregl-ctrl-icon) {
		filter: invert(1);
	}

	/* ── Pulsing marker ─────────────────────────────── */
	:global(.pulse-marker) {
		position: relative;
		width: 20px;
		height: 20px;
	}
	:global(.pulse-dot) {
		position: absolute;
		inset: 50%;
		transform: translate(-50%, -50%);
		width: 10px;
		height: 10px;
		background: #818cf8;
		border-radius: 50%;
		border: 2px solid white;
		box-shadow: 0 0 8px rgba(129, 140, 248, 0.8);
		z-index: 2;
	}
	:global(.pulse-ring) {
		position: absolute;
		inset: 50%;
		transform: translate(-50%, -50%);
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 2px solid rgba(129, 140, 248, 0.5);
		animation: pulse-expand 1.8s ease-out infinite;
	}
	@keyframes pulse-expand {
		0%   { width: 10px; height: 10px; opacity: 0.9; }
		100% { width: 44px; height: 44px; opacity: 0; }
	}
</style>
