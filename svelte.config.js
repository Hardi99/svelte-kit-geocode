import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Frankfurt: closest Vercel region to Geoapify's servers (Hetzner, EU)
		adapter: adapter({ regions: ['fra1'] }),
		// SvelteKit adds nonces/hashes for its own inline scripts
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				// 'unsafe-inline': Svelte transitions and style="" attributes inject inline styles
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'font-src': ['self', 'https://fonts.gstatic.com'],
				'img-src': ['self', 'data:', 'blob:', 'https://api.maptiler.com'],
				'connect-src': ['self', 'https://api.maptiler.com', 'https://api-adresse.data.gouv.fr'],
				// MapLibre runs its tile workers from blob: URLs
				'worker-src': ['self', 'blob:'],
				'child-src': ['self', 'blob:'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'frame-ancestors': ['none'],
				'upgrade-insecure-requests': true
			}
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
