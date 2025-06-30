import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ResolvedOptions } from "../types";
import { transform } from "./transformer";

describe("Integration Tests", () => {
	let testDir: string;
	let inputDir: string;
	let outputDir: string;
	let transformsDir: string;
	let inputFile: string;

	beforeEach(() => {
		// Create test directory structure using temporary directory
		testDir = fs.mkdtempSync(path.join(os.tmpdir(), "html-transform-integration-test-"));
		inputDir = path.join(testDir, "input");
		outputDir = path.join(testDir, "output");
		transformsDir = path.join(testDir, "transforms");
		inputFile = path.join(inputDir, "test.html");

		fs.mkdirSync(inputDir, { recursive: true });
		fs.mkdirSync(outputDir, { recursive: true });
		fs.mkdirSync(transformsDir, { recursive: true });

		// Create test input HTML
		fs.writeFileSync(
			inputFile,
			`
<!DOCTYPE html>
<html>
<head>
	<title>Original Title</title>
</head>
<body>
	<h1>Original Header</h1>
	<p class="old-class">Original content</p>
</body>
</html>
		`,
		);
	});

	afterEach(() => {
		// Clean up test files
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	it("should apply single transform to HTML", async () => {
		// Create config file
		fs.writeFileSync(
			`${transformsDir}/config.yaml`,
			`
transforms:
  - "update-title.js"
input: "${inputDir}/*.html"
output: "${outputDir}"
noFormat: true
		`,
		);

		// Create test transform
		fs.writeFileSync(
			`${transformsDir}/update-title.js`,
			`
module.exports = {
	name: "update-title",
	transform: ({ document }) => {
		const title = document.querySelector("title");
		if (title) {
			title.textContent = "Updated Title";
		}
	}
};
		`,
		);

		const resolvedOptions: ResolvedOptions = {
			input: [inputFile],
			transforms: transformsDir,
			transformOrder: ["update-title.js"],
			reference: undefined,
			outputDir: outputDir,
			dryRun: false,
			verbose: false,
			noFormat: true,
			prettierConfig: undefined,
			inputPattern: `${inputDir}/*.html`,
			config: {}
		};

		const result = await transform({
			...resolvedOptions,
			input: inputFile
		});

		expect(result).toContain("Updated Title");
		expect(result).toContain("Original Header");
	});

	it("should apply multiple transforms in order", async () => {
		// Create config file
		fs.writeFileSync(
			`${transformsDir}/config.yaml`,
			`
transforms:
  - "update-title.js"
  - "update-header.js"
  - "add-class.js"
input: "${inputDir}/*.html"
output: "${outputDir}"
noFormat: true
		`,
		);

		// Create multiple transforms
		fs.writeFileSync(
			`${transformsDir}/update-title.js`,
			`
module.exports = {
	name: "update-title",
	transform: ({ document }) => {
		const title = document.querySelector("title");
		if (title) {
			title.textContent = "Updated Title";
		}
	}
};
		`,
		);

		fs.writeFileSync(
			`${transformsDir}/update-header.js`,
			`
module.exports = {
	name: "update-header",
	transform: ({ document }) => {
		const h1 = document.querySelector("h1");
		if (h1) {
			h1.textContent = "Updated Header";
		}
	}
};
		`,
		);

		fs.writeFileSync(
			`${transformsDir}/add-class.js`,
			`
module.exports = {
	name: "add-class",
	transform: ({ document }) => {
		const p = document.querySelector(".old-class");
		if (p) {
			p.classList.add("new-class");
			p.textContent = "Updated content";
		}
	}
};
		`,
		);

		const resolvedOptions: ResolvedOptions = {
			input: [inputFile],
			transforms: transformsDir,
			transformOrder: ["update-title.js", "update-header.js", "add-class.js"],
			reference: undefined,
			outputDir: outputDir,
			dryRun: false,
			verbose: false,
			noFormat: true,
			prettierConfig: undefined,
			inputPattern: `${inputDir}/*.html`,
			config: {}
		};

		const result = await transform({
			...resolvedOptions,
			input: inputFile
		});

		expect(result).toContain("Updated Title");
		expect(result).toContain("Updated Header");
		expect(result).toContain("Updated content");
		expect(result).toContain('class="old-class new-class"');
	});

	it("should handle transform with template reference", async () => {
		// Create template file
		const templateFile = path.join(testDir, "template.html");
		fs.writeFileSync(
			templateFile,
			`
<!DOCTYPE html>
<html>
<head>
	<title>Template Title</title>
</head>
<body>
	<header>
		<h1>Template Header</h1>
		<nav>Navigation</nav>
	</header>
</body>
</html>
		`,
		);

		// Create config file
		fs.writeFileSync(
			`${transformsDir}/config.yaml`,
			`
transforms:
  - "copy-header.js"
input: "${inputDir}/*.html"
output: "${outputDir}"
reference: "${templateFile}"
noFormat: true
		`,
		);

		// Create transform that uses template
		fs.writeFileSync(
			`${transformsDir}/copy-header.js`,
			`
module.exports = {
	name: "copy-header",
	transform: ({ document, templateDocument }) => {
		const oldHeader = document.querySelector("h1");
		const templateHeader = templateDocument?.querySelector("h1");

		if (oldHeader && templateHeader) {
			oldHeader.textContent = templateHeader.textContent;
		}
	}
};
		`,
		);

		const resolvedOptions: ResolvedOptions = {
			input: [inputFile],
			transforms: transformsDir,
			transformOrder: ["copy-header.js"],
			reference: templateFile,
			outputDir: outputDir,
			dryRun: false,
			verbose: false,
			noFormat: true,
			prettierConfig: undefined,
			inputPattern: `${inputDir}/*.html`,
			config: {}
		};

		const result = await transform({
			...resolvedOptions,
			input: inputFile
		});

		expect(result).toContain("Template Header");
	});

	it("should handle configuration object", async () => {
		// Create transforms config file
		fs.writeFileSync(
			`${transformsDir}/config.yaml`,
			`
transforms:
  - "use-config.js"
input: "${inputDir}/*.html"
output: "${outputDir}"
noFormat: true
		`,
		);

		// Create transform that uses a fixed value
		fs.writeFileSync(
			`${transformsDir}/use-config.js`,
			`
module.exports = {
	name: "use-config",
	transform: ({ document }) => {
		const title = document.querySelector("title");
		if (title) {
			title.textContent = "Test Site v1.0.0";
		}
	}
};
		`,
		);

		const resolvedOptions: ResolvedOptions = {
			input: [inputFile],
			transforms: transformsDir,
			transformOrder: ["use-config.js"],
			reference: undefined,
			outputDir: outputDir,
			dryRun: false,
			verbose: false,
			noFormat: true,
			prettierConfig: undefined,
			inputPattern: `${inputDir}/*.html`,
			config: {}
		};

		const result = await transform({
			...resolvedOptions,
			input: inputFile
		});

		expect(result).toContain("Test Site v1.0.0");
	});
});
