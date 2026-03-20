<script lang="ts">
	import { slide } from 'svelte/transition';
	import { ChevronDown, Loader2, X, MapPin } from 'lucide-svelte';
	import { poisStore, POI_CATEGORIES, RADIUS_OPTIONS, type POICategory } from '$lib/stores/poisStore.svelte';
	import { searchStore } from '$lib/stores/searchStore.svelte';
	import type { Labels } from '$lib/i18n/labels';

	interface Props { t: Labels }
	let { t }: Props = $props();

	const isFr = $derived(t.isoFoot === 'À pied');

	/* ── Auto-compute when open or radius changes ─────── */
	$effect(() => {
		const addr  = searchStore.selectedAddress;
		const open   = poisStore.open;
		const radius = poisStore.radius; // track dep

		if (open && addr) {
			poisStore.compute(addr.coordinates[0], addr.coordinates[1]);
		}
	});

	const totalVisible = $derived(
		poisStore.pois.filter((p) => poisStore.visibleCategories.includes(p.category)).length
	);

	function radiusLabel(r: number) {
		return r >= 1000 ? '1 km' : `${r} m`;
	}
</script>

<div class="poi-section">
	<!-- ── Header ─────────────────────────────────────── -->
	<button
		class="poi-header"
		onclick={() => poisStore.toggle()}
		disabled={!searchStore.selectedAddress}
	>
		<div class="flex items-center gap-2">
			<MapPin size={12} class="text-[--color-text-muted]" />
			<span class="section-label">{t.poiTitle}</span>
			{#if poisStore.loading}
				<Loader2 size={11} class="animate-spin text-[--color-text-muted]" />
			{:else if poisStore.pois.length > 0}
				<span class="count-badge">{totalVisible}</span>
			{/if}
		</div>
		<ChevronDown
			size={14}
			class="text-[--color-text-muted]"
			style="transform: rotate({poisStore.open ? '180deg' : '0deg'}); transition: transform 200ms"
		/>
	</button>

	<!-- ── Body ───────────────────────────────────────── -->
	{#if poisStore.open}
		<div class="poi-body" transition:slide={{ duration: 200 }}>

			<!-- Radius selector -->
			<div class="radius-row">
				<span class="section-label">{t.poiRadius}</span>
				<div class="radius-pills">
					{#each RADIUS_OPTIONS as r}
						<button
							class="pill"
							class:active={poisStore.radius === r}
							onclick={() => poisStore.setRadius(r)}
						>
							{radiusLabel(r)}
						</button>
					{/each}
				</div>
			</div>

			<!-- Error -->
			{#if poisStore.error}
				<p class="poi-error">{t.poiError}</p>
			{/if}

			<!-- Category toggles -->
			{#if !poisStore.loading && poisStore.pois.length > 0}
				<div class="categories">
					{#each Object.entries(POI_CATEGORIES) as [id, cat]}
						{@const count = poisStore.counts[id as POICategory]}
						{#if count > 0}
							<button
								class="cat-chip"
								class:inactive={!poisStore.visibleCategories.includes(id as POICategory)}
								onclick={() => poisStore.toggleCategory(id as POICategory)}
								style="--cat-color: {cat.color}"
							>
								<span class="cat-dot" style="background:{cat.color}"></span>
								<span class="cat-name">{isFr ? cat.label.fr : cat.label.en}</span>
								<span class="cat-count">{count}</span>
							</button>
						{/if}
					{/each}
				</div>

				<button class="clear-btn" onclick={() => { poisStore.clear(); }}>
					<X size={11} />
					<span>{t.poiClear}</span>
				</button>
			{:else if !poisStore.loading && !poisStore.error}
				<p class="empty-msg">{t.poiEmpty}</p>
			{/if}

		</div>
	{/if}
</div>

<style>
	.poi-section {
		border-top: 1px solid var(--color-border-soft);
		padding-top: 2px;
	}

	.poi-header {
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

	.poi-header:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.section-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-muted);
	}

	.count-badge {
		font-size: 10px;
		font-weight: 600;
		background: var(--color-accent-glow);
		color: var(--color-accent);
		border: 1px solid var(--color-accent);
		border-radius: 10px;
		padding: 1px 6px;
		line-height: 1.4;
	}

	.poi-body {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 10px;
	}

	/* ── Radius ──────────────────────────────────────── */
	.radius-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.radius-pills {
		display: flex;
		gap: 4px;
	}

	.pill {
		font-size: 11px;
		padding: 4px 9px;
		border-radius: 20px;
		border: 1px solid var(--color-border);
		background: var(--color-surface-2);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color 150ms, background 150ms, border-color 150ms;
	}

	.pill.active {
		color: var(--color-accent);
		background: var(--color-accent-glow);
		border-color: var(--color-accent);
	}

	/* ── Categories ──────────────────────────────────── */
	.categories {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.cat-chip {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 8px;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--cat-color) 30%, transparent);
		background: color-mix(in srgb, var(--cat-color) 10%, transparent);
		color: var(--color-text-primary);
		cursor: pointer;
		font-size: 11px;
		transition: opacity 150ms, border-color 150ms;
	}

	.cat-chip.inactive {
		opacity: 0.35;
		border-color: var(--color-border);
		background: transparent;
	}

	.cat-dot {
		display: block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.cat-name { color: var(--color-text-primary); }

	.cat-count {
		font-size: 10px;
		color: var(--color-text-muted);
		margin-left: 1px;
	}

	/* ── Footer ──────────────────────────────────────── */
	.clear-btn {
		display: flex;
		align-items: center;
		gap: 3px;
		align-self: flex-end;
		background: transparent;
		border: none;
		color: var(--color-text-subtle);
		font-size: 10px;
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 4px;
		transition: color 150ms;
	}

	.clear-btn:hover { color: #ef4444; }

	.empty-msg, .poi-error {
		font-size: 11px;
		border-radius: 6px;
		padding: 6px 10px;
	}

	.empty-msg {
		color: var(--color-text-muted);
		background: var(--color-surface-2);
	}

	.poi-error {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}
</style>
