<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Géocode — Address Intelligence</title>
	<meta name="description" content="French address geocoding & territory intelligence" />
</svelte:head>

{@render children()}
