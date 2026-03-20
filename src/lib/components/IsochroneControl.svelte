<script lang="ts">
	import { slide } from 'svelte/transition';
	import { ChevronDown, Footprints, Bike, Car, Loader2, X } from 'lucide-svelte';
	import { isochroneStore, ISOCHRONE_COLORS } from '$lib/stores/isochroneStore.svelte';
	import { searchStore } from '$lib/stores/searchStore.svelte';
	import type { Labels } from '$lib/i18n/labels';

	interface Props { t: Labels }
	let { t }: Props = $props();

	const modes = [
		{ id: 'pedestrian' as const, icon: Footprints, labelFr: 'Pied',    labelEn: 'Walk'   },
		{ id: 'bicycle'    as const, icon: Bike,       labelFr: 'Vélo',    labelEn: 'Bike'   },
		{ id: 'auto'       as const, icon: Car,        labelFr: 'Voiture', labelEn: 'Drive'  }
	];

	const legend = [
		{ time: 5,  label: '5 min'  },
		{ time: 10, label: '10 min' },
		{ time: 15, label: '15 min' }
	];

	/* ── Auto-compute when panel opens or mode changes ── */
	$effect(() => {
		const addr = searchStore.selectedAddress;
		const open = isochroneStore.open;
		const mode = isochroneStore.mode; // track dependency

		if (open && addr) {
			isochroneStore.compute(addr.coordinates[0], addr.coordinates[1]);
		}
	});

	function handleToggle() {
		isochroneStore.toggle();
	}

	function handleMode(id: typeof modes[number]['id']) {
		isochroneStore.setMode(id);
	}

	function handleClear() {
		isochroneStore.clear();
	}

	const modeLabel = $derived(
		(id: string) => t.isoFoot === 'À pied'
			? modes.find(m => m.id === id)?.labelFr
			: modes.find(m => m.id === id)?.labelEn
	);
</script>

<div class="iso-section">
	<!-- ── Header toggle ──────────────────────────────── -->
	<button
		class="iso-header"
		onclick={handleToggle}
		disabled={!searchStore.selectedAddress}
	>
		<div class="flex items-center gap-2">
			<div class="iso-dot-row">
				{#each legend as l}
					<span class="dot" style="background:{ISOCHRONE_COLORS[l.time]}"></span>
				{/each}
			</div>
			<span class="section-label">{t.isoTitle}</span>
			{#if isochroneStore.loading}
				<Loader2 size={11} class="animate-spin text-[--color-text-muted]" />
			{/if}
		</div>
		<ChevronDown
			size={14}
			class="chevron text-[--color-text-muted]"
			style="transform: rotate({isochroneStore.open ? '180deg' : '0deg'}); transition: transform 200ms"
		/>
	</button>

	<!-- ── Expanded content ───────────────────────────── -->
	{#if isochroneStore.open}
		<div class="iso-body" transition:slide={{ duration: 200 }}>

			<!-- Mode selector -->
			<div class="mode-row">
				{#each modes as m}
					<button
						class="mode-btn"
						class:active={isochroneStore.mode === m.id}
						onclick={() => handleMode(m.id)}
						title={t.isoFoot === 'À pied' ? m.labelFr : m.labelEn}
					>
						<m.icon size={14} />
						<span>{t.isoFoot === 'À pied' ? m.labelFr : m.labelEn}</span>
					</button>
				{/each}
			</div>

			<!-- Error state -->
			{#if isochroneStore.error}
				<p class="iso-error">{t.isoError}</p>
			{/if}

			<!-- Legend -->
			{#if isochroneStore.data && !isochroneStore.loading}
				<div class="legend">
					{#each legend as l}
						<div class="legend-item">
							<span class="legend-swatch" style="background:{ISOCHRONE_COLORS[l.time]}"></span>
							<span class="legend-label">{l.label}</span>
						</div>
					{/each}
					<button class="clear-btn" onclick={handleClear} title={t.isoClear}>
						<X size={11} />
						<span>{t.isoClear}</span>
					</button>
				</div>
			{/if}

		</div>
	{/if}
</div>

<style>
	.iso-section {
		border-top: 1px solid var(--color-border-soft);
		padding-top: 2px;
	}

	.iso-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: transparent;
		border: none;
		padding: 10px 0;
		cursor: pointer;
		color: var(--color-text-primary);
	}

	.iso-header:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.iso-header:not(:disabled):hover .section-label {
		color: var(--color-text-primary);
	}

	.section-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-muted);
		transition: color 150ms;
	}

	.iso-dot-row {
		display: flex;
		gap: 3px;
		align-items: center;
	}

	.dot {
		display: block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		opacity: 0.85;
	}

	.iso-body {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 10px;
	}

	/* ── Mode selector ───────────────────────────────── */
	.mode-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}

	.mode-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 7px 6px;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-surface-2);
		color: var(--color-text-muted);
		font-size: 11px;
		cursor: pointer;
		transition: color 150ms, background 150ms, border-color 150ms;
	}

	.mode-btn:hover {
		color: var(--color-text-primary);
		background: var(--color-surface-3);
	}

	.mode-btn.active {
		color: var(--color-accent);
		background: var(--color-accent-glow);
		border-color: var(--color-accent);
	}

	/* ── Legend ──────────────────────────────────────── */
	.legend {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.legend-swatch {
		display: block;
		width: 20px;
		height: 6px;
		border-radius: 3px;
		opacity: 0.85;
	}

	.legend-label {
		font-size: 11px;
		color: var(--color-text-muted);
	}

	.clear-btn {
		display: flex;
		align-items: center;
		gap: 3px;
		margin-left: auto;
		background: transparent;
		border: none;
		color: var(--color-text-subtle);
		font-size: 10px;
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 4px;
		transition: color 150ms;
	}

	.clear-btn:hover {
		color: #ef4444;
	}

	/* ── Error ───────────────────────────────────────── */
	.iso-error {
		font-size: 11px;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 6px;
		padding: 6px 10px;
	}
</style>
