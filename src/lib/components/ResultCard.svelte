<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Copy, Check, MapPin } from 'lucide-svelte';
	import type { SelectedAddress } from '$lib/types';
	import type { Labels } from '$lib/i18n/labels';

	interface Props {
		address: SelectedAddress;
		t: Labels;
	}
	let { address, t }: Props = $props();

	let copied = $state(false);

	function copyCoords() {
		const text = `${address.coordinates[1].toFixed(6)}, ${address.coordinates[0].toFixed(6)}`;
		navigator.clipboard.writeText(text).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}

	const lat = $derived(address.coordinates[1].toFixed(6));
	const lng = $derived(address.coordinates[0].toFixed(6));
</script>

<div class="result-card" transition:fly={{ y: 8, duration: 220 }}>
	<!-- Header -->
	<div class="card-header">
		<div class="flex items-center gap-2">
			<MapPin size={13} class="text-accent" />
			<span class="section-label">{t.resultTitle}</span>
		</div>
		<div class="context-badge">{address.context}</div>
	</div>

	<!-- Fields -->
	<div class="fields">
		<div class="field-item">
			<span class="field-label">{t.fieldAddress}</span>
			<span class="field-value">{address.name}</span>
		</div>

		<div class="fields-row">
			<div class="field-item">
				<span class="field-label">{t.fieldPostcode}</span>
				<span class="field-value">{address.postcode}</span>
			</div>
			<div class="field-item">
				<span class="field-label">{t.fieldCity}</span>
				<span class="field-value">{address.city}</span>
			</div>
		</div>

		<!-- Coordinates -->
		<div class="coord-row">
			<div class="coord-block">
				<span class="field-label">{t.fieldCoords}</span>
				<span class="coord-value">{lat}, {lng}</span>
			</div>
			<button class="copy-btn" onclick={copyCoords} title={t.copyCoords}>
				{#if copied}
					<Check size={13} />
				{:else}
					<Copy size={13} />
				{/if}
				<span>{copied ? t.copied : t.copyCoords}</span>
			</button>
		</div>
	</div>
</div>

<style>
	.result-card {
		border-top: 1px solid var(--color-border-soft);
		padding-top: 16px;
		margin-top: 4px;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.context-badge {
		font-size: 10px;
		color: var(--color-text-muted);
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 2px 6px;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.fields-row {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px;
	}

	.field-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.section-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.field-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-subtle);
	}

	.field-value {
		font-size: 13px;
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.coord-row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 8px;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border-soft);
		border-radius: 8px;
		padding: 10px 12px;
	}

	.coord-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.coord-value {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-success);
		letter-spacing: 0.02em;
	}

	.copy-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--color-text-muted);
		background: var(--color-surface-3);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 5px 8px;
		cursor: pointer;
		font-size: 11px;
		transition: color 150ms, border-color 150ms;
		white-space: nowrap;
	}

	.copy-btn:hover {
		color: var(--color-text-primary);
		border-color: var(--color-accent);
	}
</style>
