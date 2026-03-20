<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { AddressFeature } from '$lib/types';

	interface Props {
		features: AddressFeature[];
		activeIndex: number;
		onSelect: (f: AddressFeature) => void;
	}
	let { features, activeIndex, onSelect }: Props = $props();

	function scoreColor(score: number): string {
		if (score >= 0.8) return 'bg-emerald-500';
		if (score >= 0.5) return 'bg-amber-400';
		return 'bg-red-400';
	}
</script>

{#if features.length > 0}
	<ul
		class="dropdown"
		role="listbox"
		transition:fly={{ y: -6, duration: 180 }}
	>
		{#each features as feature, i}
			<li
				role="option"
				aria-selected={i === activeIndex}
				class="dropdown-item"
				class:active={i === activeIndex}
				onmousedown={() => onSelect(feature)}
			>
				<div class="flex items-center gap-2 min-w-0">
					<svg class="shrink-0 text-[--color-text-muted]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
						<circle cx="12" cy="10" r="3"/>
					</svg>
					<span class="truncate text-sm text-[--color-text-primary]">
						{feature.properties.label}
					</span>
				</div>
				<div class="flex items-center gap-2 shrink-0">
					<span class="text-xs text-[--color-text-muted]">{feature.properties.postcode}</span>
					<span class="score-bar {scoreColor(feature.properties.score)}"></span>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.dropdown {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 50;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03) inset;
		list-style: none;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 14px;
		cursor: pointer;
		border-bottom: 1px solid var(--color-border-soft);
		transition: background 120ms ease;
	}

	.dropdown-item:last-child { border-bottom: none; }

	.dropdown-item:hover,
	.dropdown-item.active {
		background: var(--color-surface-3);
	}

	.score-bar {
		display: block;
		width: 4px;
		height: 14px;
		border-radius: 2px;
		opacity: 0.7;
	}
</style>
