import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadModule, loadTransformModule } from "./moduleLoader";

describe("moduleLoader utils", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = fs.mkdtempSync(path.join(os.tmpdir(), "module-loader-test-"));
	});

	afterEach(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("loadModule", () => {
		it("should load JavaScript module", () => {
			const modulePath = path.join(testDir, "test.js");
			fs.writeFileSync(
				modulePath,
				`
module.exports = {
	name: "test-module",
	value: 42
};
			`,
			);

			const result = loadModule(modulePath);

			expect(result).toEqual({
				name: "test-module",
				value: 42,
			});
		});

		it("should load TypeScript module", () => {
			const modulePath = path.join(testDir, "test.ts");
			fs.writeFileSync(
				modulePath,
				`
export default {
	name: "ts-module",
	value: 100
};
			`,
			);

			const result = loadModule(modulePath);

			expect(result.default).toEqual({
				name: "ts-module",
				value: 100,
			});
		});

		it("should throw error for missing file", () => {
			const modulePath = path.join(testDir, "missing.js");

			expect(() => loadModule(modulePath)).toThrow(
				"Failed to load module from",
			);
		});

		it("should throw error for invalid module syntax", () => {
			const modulePath = path.join(testDir, "invalid.js");
			fs.writeFileSync(modulePath, "invalid javascript syntax {");

			expect(() => loadModule(modulePath)).toThrow(
				"Failed to load module from",
			);
		});
	});

	describe("loadTransformModule", () => {
		it("should load valid transform from JavaScript file", async () => {
			const modulePath = path.join(testDir, "transform.js");
			fs.writeFileSync(
				modulePath,
				`
module.exports = {
	name: "test-transform",
	description: "Test transform",
	transform: ({ document }) => {
		// Transform logic here
	}
};
			`,
			);

			const result = await loadTransformModule(modulePath, true);

			expect(result.name).toBe("test-transform");
			expect(result.description).toBe("Test transform");
			expect(typeof result.transform).toBe("function");
		});

		it("should load valid transform with default export", async () => {
			const modulePath = path.join(testDir, "transform.js");
			fs.writeFileSync(
				modulePath,
				`
module.exports = {
	default: {
		name: "default-transform",
		transform: ({ document }) => {}
	}
};
			`,
			);

			const result = await loadTransformModule(modulePath, true);

			expect(result.name).toBe("default-transform");
			expect(typeof result.transform).toBe("function");
		});

		it("should load TypeScript transform", async () => {
			const modulePath = path.join(testDir, "transform.ts");
			fs.writeFileSync(
				modulePath,
				`
export default {
	name: "ts-transform",
	transform: ({ document }) => {
		// TypeScript transform logic
	}
};
			`,
			);

			const result = await loadTransformModule(modulePath, true);

			expect(result.name).toBe("ts-transform");
			expect(typeof result.transform).toBe("function");
		});

		it("should throw error for module without transform function", async () => {
			const modulePath = path.join(testDir, "invalid-transform.js");
			fs.writeFileSync(
				modulePath,
				`
module.exports = {
	name: "invalid",
	// Missing transform function
};
			`,
			);

			await expect(loadTransformModule(modulePath, true)).rejects.toThrow(
				"Transform file does not export a valid transform function",
			);
		});

		it("should throw error for module with non-function transform", async () => {
			const modulePath = path.join(testDir, "invalid-transform.js");
			fs.writeFileSync(
				modulePath,
				`
module.exports = {
	name: "invalid",
	transform: "not a function"
};
			`,
			);

			await expect(loadTransformModule(modulePath, true)).rejects.toThrow(
				"Transform file does not export a valid transform function",
			);
		});

		it("should throw error for missing file", async () => {
			const modulePath = path.join(testDir, "missing-transform.js");

			await expect(loadTransformModule(modulePath, true)).rejects.toThrow(
				"Failed to load module from",
			);
		});

		it("should handle complex transform module", async () => {
			const modulePath = path.join(testDir, "complex-transform.js");
			fs.writeFileSync(
				modulePath,
				`
module.exports = {
	name: "complex-transform",
	description: "A complex transformation",
	order: 1,
	transform: async ({ document, templateDocument }) => {
		// Complex transform logic here
		const title = document.querySelector("title");
		if (title) {
			title.textContent = "Complex Title";
		}
	}
};
			`,
			);

			const result = await loadTransformModule(modulePath, true);

			expect(result.name).toBe("complex-transform");
			expect(result.description).toBe("A complex transformation");
			expect(result.order).toBe(1);
			expect(typeof result.transform).toBe("function");
		});
	});
});