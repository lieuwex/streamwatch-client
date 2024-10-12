import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		legacy({
			modernTargets: [
				'last 3 edge versions',
				'last 3 firefox versions',
				'last 3 chrome versions',
				'last 3 chromeAndroid versions',
				'ios >= 18',
			],
			modernPolyfills: true,
			renderLegacyChunks: false,
		})
	],
});
