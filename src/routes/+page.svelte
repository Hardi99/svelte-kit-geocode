<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import SearchPanel from '$lib/components/SearchPanel.svelte';
</script>

<div class="app-shell">
	<Map />
	<SearchPanel />
</div>

<style>
	.app-shell {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}
</style>
