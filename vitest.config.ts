import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		exclude: [
			"node_modules",
			"dist",
			"test/transforms",
			"test/input.html",
			"test/output.html",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"test/",
				"**/*.d.ts",
				"**/*.config.*",
				"coverage/",
			],
		},
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});
