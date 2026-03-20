<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Search, Loader2, Crosshair, Clock, Trash2, Globe, X } from 'lucide-svelte';
	import { poisStore } from '$lib/stores/poisStore.svelte';
	import Dropdown from './Dropdown.svelte';
	import ResultCard from './ResultCard.svelte';
	import POIControl from './POIControl.svelte';
	import { searchAddress } from '$lib/api/adresse';
	import type { AddressFeature } from '$lib/types';
	import { searchStore } from '$lib/stores/searchStore.svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { labels, type Labels } from '$lib/i18n/labels';

	const t: Labels = $derived(labels[searchStore.lang]);

	let query = $state('');
	let suggestions = $state<AddressFeature[]>([]);
	let loading = $state(false);
	let activeIndex = $state(-1);
	let inputEl: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout>;

	/* ── Debounced search ───────────────────────────────── */
	function handleInput() {
		clearTimeout(debounceTimer);
		activeIndex = -1;

		if (query.length < 3) {
			suggestions = [];
			return;
		}

		loading = true;
		debounceTimer = setTimeout(async () => {
			try {
				suggestions = await searchAddress(query);
			} finally {
				loading = false;
			}
		}, 300);
	}

	/* ── Keyboard navigation ────────────────────────────── */
	function handleKeydown(e: KeyboardEvent) {
		if (!suggestions.length) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			e.preventDefault();
			selectFeature(suggestions[activeIndex]);
		} else if (e.key === 'Escape') {
			suggestions = [];
			activeIndex = -1;
		}
	}

	/* ── Select from dropdown ───────────────────────────── */
	function selectFeature(feature: AddressFeature) {
		const addr = {
			label: feature.properties.label,
			name: feature.properties.name,
			postcode: feature.properties.postcode,
			city: feature.properties.city,
			context: feature.properties.context,
			coordinates: feature.geometry.coordinates as [number, number],
			timestamp: Date.now()
		};
		searchStore.setSelectedAddress(addr);
		mapStore.flyTo(addr.coordinates);
		query = addr.label;
		suggestions = [];
		activeIndex = -1;
		inputEl?.blur();
	}

	/* ── Select from history ────────────────────────────── */
	function selectHistory(h: typeof searchStore.searchHistory[number]) {
		searchStore.setSelectedAddress(h);
		mapStore.flyTo(h.coordinates);
		query = h.label;
	}

	/* ── Close dropdown on outside click ───────────────── */
	function handleBlur() {
		setTimeout(() => (suggestions = []), 150);
	}

	/* ── Select all on focus (easy re-search) ───────────── */
	function handleFocus() {
		inputEl?.select();
	}

	/* ── Clear everything ───────────────────────────────── */
	function clearSearch() {
		query = '';
		suggestions = [];
		searchStore.clearSelection();
		poisStore.clear();
		inputEl?.focus();
	}

	/* ── Sync input when reverse geocoding fills result ─── */
	$effect(() => {
		if (searchStore.selectedAddress) {
			query = searchStore.selectedAddress.label;
		}
	});
</script>

<aside class="panel panel-glass">
	<!-- ── Header ─────────────────────────────────────── -->
	<header class="panel-header">
		<div>
			<h1 class="brand">{t.title}</h1>
			<p class="brand-sub">{t.subtitle}</p>
		</div>
		<button class="lang-btn" onclick={() => searchStore.toggleLang()} title="Switch language">
			<Globe size={14} />
			<span>{searchStore.lang.toUpperCase()}</span>
		</button>
	</header>

	<!-- ── Search ─────────────────────────────────────── -->
	<div class="search-wrapper">
		<div class="search-box" class:reverse-active={mapStore.isReverseMode}>
			<div class="search-icon">
				{#if loading}
					<Loader2 size={15} class="animate-spin text-[--color-accent]" />
				{:else}
					<Search size={15} class="text-[--color-text-muted]" />
				{/if}
			</div>

			<input
				bind:this={inputEl}
				bind:value={query}
				type="text"
				autocomplete="off"
				spellcheck="false"
				placeholder={mapStore.isReverseMode ? t.reverseHint : t.placeholder}
				disabled={mapStore.isReverseMode}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onblur={handleBlur}
				onfocus={handleFocus}
				class="search-input"
			/>

			{#if query && !mapStore.isReverseMode}
				<button class="clear-input-btn" onmousedown={clearSearch} title="Effacer">
					<X size={13} />
				</button>
			{/if}

			<button
				class="reverse-btn"
				class:active={mapStore.isReverseMode}
				onclick={() => mapStore.toggleReverseMode()}
				title={mapStore.isReverseMode ? t.reverseOff : t.reverseOn}
			>
				<Crosshair size={14} />
			</button>
		</div>

		<!-- Dropdown -->
		<div class="relative">
			<Dropdown
				features={suggestions}
				{activeIndex}
				onSelect={selectFeature}
			/>
		</div>
	</div>

	<!-- ── Reverse mode hint ───────────────────────────── -->
	{#if mapStore.isReverseMode}
		<p class="hint-text" transition:fly={{ y: -4, duration: 160 }}>
			{t.reverseHint}
		</p>
	{/if}

	<!-- ── Result ─────────────────────────────────────── -->
	{#if searchStore.selectedAddress}
		<ResultCard address={searchStore.selectedAddress} {t} />
		<POIControl {t} />
	{/if}

	<!-- ── History ─────────────────────────────────────── -->
	{#if searchStore.searchHistory.length > 0 && !mapStore.isReverseMode}
		<div class="history" transition:fly={{ y: 6, duration: 180 }}>
			<div class="history-header">
				<div class="flex items-center gap-2">
					<Clock size={11} class="text-[--color-text-muted]" />
					<span class="section-label">{t.historyTitle}</span>
				</div>
			</div>
			<ul class="history-list">
				{#each searchStore.searchHistory as h (h.timestamp)}
					<li class="history-item">
						<button class="history-label" onclick={() => selectHistory(h)}>
							<span class="truncate text-xs">{h.label}</span>
						</button>
						<button
							class="history-delete"
							onclick={() => searchStore.removeFromHistory(h.label)}
							title="Remove"
						>
							<Trash2 size={10} />
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</aside>

<style>
	.panel {
		position: absolute;
		top: 20px;
		left: 20px;
		z-index: 10;
		width: 340px;
		max-height: calc(100vh - 40px);
		border-radius: 14px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;
	}

	/* ── Header ─────────────────────────────────────── */
	.panel-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.brand {
		font-size: 18px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		line-height: 1;
	}

	.brand-sub {
		font-size: 11px;
		color: var(--color-text-muted);
		margin-top: 3px;
		letter-spacing: 0.02em;
	}

	.lang-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-text-muted);
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 5px 8px;
		cursor: pointer;
		transition: color 150ms, border-color 150ms;
	}
	.lang-btn:hover {
		color: var(--color-text-primary);
		border-color: var(--color-accent);
	}

	/* ── Search ─────────────────────────────────────── */
	.search-wrapper {
		position: relative;
	}

	.search-box {
		display: flex;
		align-items: center;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		gap: 8px;
		padding: 0 10px;
		transition: border-color 200ms, box-shadow 200ms;
	}

	.search-box:focus-within {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px var(--color-accent-glow);
	}

	.search-box.reverse-active {
		border-color: #f59e0b;
		box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
	}

	.search-icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		height: 42px;
		background: transparent;
		border: none;
		outline: none;
		color: var(--color-text-primary);
		font-size: 13px;
		font-family: var(--font-sans);
		caret-color: var(--color-accent);
	}

	.search-input::placeholder {
		color: var(--color-text-subtle);
		font-size: 12px;
	}

	.search-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.clear-input-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: none;
		background: var(--color-surface-3);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color 150ms, background 150ms;
	}

	.clear-input-btn:hover {
		color: var(--color-text-primary);
		background: #2a2a2a;
	}

	.reverse-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color 150ms, background 150ms, border-color 150ms;
	}

	.reverse-btn:hover,
	.reverse-btn.active {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.3);
	}

	/* ── Hint ───────────────────────────────────────── */
	.hint-text {
		font-size: 11px;
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 8px;
		padding: 8px 12px;
		margin-top: -6px;
	}

	/* ── History ────────────────────────────────────── */
	.history {
		border-top: 1px solid var(--color-border-soft);
		padding-top: 14px;
	}

	.history-header {
		margin-bottom: 8px;
	}

	.section-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-muted);
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		list-style: none;
	}

	.history-item {
		display: flex;
		align-items: center;
		border-radius: 6px;
		overflow: hidden;
	}

	.history-label {
		flex: 1;
		text-align: left;
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		padding: 6px 8px;
		cursor: pointer;
		border-radius: 6px;
		transition: color 120ms, background 120ms;
		min-width: 0;
		display: flex;
	}

	.history-label:hover {
		color: var(--color-text-primary);
		background: var(--color-surface-2);
	}

	.history-delete {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: transparent;
		border: none;
		color: var(--color-text-subtle);
		cursor: pointer;
		border-radius: 4px;
		opacity: 0;
		transition: opacity 120ms, color 120ms;
	}

	.history-item:hover .history-delete {
		opacity: 1;
	}

	.history-delete:hover {
		color: #ef4444;
	}

	/* ── Responsive ─────────────────────────────────── */
	@media (max-width: 480px) {
		.panel {
			top: 0;
			left: 0;
			right: 0;
			width: 100%;
			border-radius: 0 0 14px 14px;
			max-height: 60vh;
		}
	}
</style>
