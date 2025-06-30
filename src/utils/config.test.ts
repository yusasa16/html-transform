import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findConfigFile, loadConfig } from "./config";

describe("config utils", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-test-"));
	});

	afterEach(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("loadConfig", () => {
		it("should load YAML config file", () => {
			const configPath = path.join(testDir, "config.yaml");
			fs.writeFileSync(
				configPath,
				`
transforms:
  - "transform1.ts"
  - "transform2.ts"
input: "input/**/*.html"
output: "output"
verbose: true
noFormat: false
			`,
			);

			const config = loadConfig(configPath);

			expect(config.transforms).toEqual(["transform1.ts", "transform2.ts"]);
			expect(config.input).toBe("input/**/*.html");
			expect(config.output).toBe("output");
			expect(config.verbose).toBe(true);
			expect(config.noFormat).toBe(false);
		});

		it("should load YML config file", () => {
			const configPath = path.join(testDir, "config.yml");
			fs.writeFileSync(
				configPath,
				`
transforms:
  - "transform.ts"
input: "src/*.html"
output: "dist"
			`,
			);

			const config = loadConfig(configPath);

			expect(config.transforms).toEqual(["transform.ts"]);
			expect(config.input).toBe("src/*.html");
			expect(config.output).toBe("dist");
		});

		it("should load JSON config file", () => {
			const configPath = path.join(testDir, "config.json");
			fs.writeFileSync(
				configPath,
				JSON.stringify({
					transforms: ["transform.js"],
					input: "pages/*.html",
					output: "build",
					dryRun: true,
				}),
			);

			const config = loadConfig(configPath);

			expect(config.transforms).toEqual(["transform.js"]);
			expect(config.input).toBe("pages/*.html");
			expect(config.output).toBe("build");
			expect(config.dryRun).toBe(true);
		});

		it("should throw error for missing file", () => {
			const configPath = path.join(testDir, "non-existent.yaml");

			expect(() => loadConfig(configPath)).toThrow("File not found");
		});

		it("should throw error for unsupported format", () => {
			const configPath = path.join(testDir, "config.txt");
			fs.writeFileSync(configPath, "some content");

			expect(() => loadConfig(configPath)).toThrow(
				"Unsupported config file format: .txt",
			);
		});

		it("should throw error for invalid YAML", () => {
			const configPath = path.join(testDir, "config.yaml");
			fs.writeFileSync(configPath, "invalid: yaml: content: [");

			expect(() => loadConfig(configPath)).toThrow("Failed to parse config file");
		});

		it("should throw error for invalid JSON", () => {
			const configPath = path.join(testDir, "config.json");
			fs.writeFileSync(configPath, "{ invalid json }");

			expect(() => loadConfig(configPath)).toThrow("Failed to parse config file");
		});
	});

	describe("findConfigFile", () => {
		it("should find config.yaml", () => {
			const configPath = path.join(testDir, "config.yaml");
			fs.writeFileSync(configPath, "transforms: []");

			const result = findConfigFile(testDir);

			expect(result).toBe(configPath);
		});

		it("should find config.yml", () => {
			const configPath = path.join(testDir, "config.yml");
			fs.writeFileSync(configPath, "transforms: []");

			const result = findConfigFile(testDir);

			expect(result).toBe(configPath);
		});

		it("should find config.json", () => {
			const configPath = path.join(testDir, "config.json");
			fs.writeFileSync(configPath, '{"transforms": []}');

			const result = findConfigFile(testDir);

			expect(result).toBe(configPath);
		});

		it("should prioritize config.yaml over config.yml", () => {
			const yamlPath = path.join(testDir, "config.yaml");
			const ymlPath = path.join(testDir, "config.yml");
			fs.writeFileSync(yamlPath, "transforms: []");
			fs.writeFileSync(ymlPath, "transforms: []");

			const result = findConfigFile(testDir);

			expect(result).toBe(yamlPath);
		});

		it("should prioritize config.yml over config.json", () => {
			const ymlPath = path.join(testDir, "config.yml");
			const jsonPath = path.join(testDir, "config.json");
			fs.writeFileSync(ymlPath, "transforms: []");
			fs.writeFileSync(jsonPath, '{"transforms": []}');

			const result = findConfigFile(testDir);

			expect(result).toBe(ymlPath);
		});

		it("should return null when no config file exists", () => {
			const result = findConfigFile(testDir);

			expect(result).toBeNull();
		});
	});
});