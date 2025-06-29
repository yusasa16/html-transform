import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CLIOptions } from "../types";
import { transform } from "./transformer";

describe("Integration Tests", () => {
	const testDir = "/tmp/html-transform-integration-test";
	const inputFile = `${testDir}/input.html`;
	const _outputFile = `${testDir}/output.html`;
	const transformsDir = `${testDir}/transforms`;

	beforeEach(() => {
		// Create test directory structure
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
		fs.mkdirSync(testDir, { recursive: true });
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
		// Create test transform
		fs.writeFileSync(
			`${transformsDir}/01-update-title.js`,
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

		const options: CLIOptions = {
			input: inputFile,
			transforms: transformsDir,
			noFormat: true,
		};

		const result = await transform(options);

		expect(result).toContain("Updated Title");
		expect(result).toContain("Original Header");
	});

	it("should apply multiple transforms in order", async () => {
		// Create multiple transforms
		fs.writeFileSync(
			`${transformsDir}/01-update-title.js`,
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
			`${transformsDir}/02-update-header.js`,
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
			`${transformsDir}/03-add-class.js`,
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

		const options: CLIOptions = {
			input: inputFile,
			transforms: transformsDir,
			noFormat: true,
		};

		const result = await transform(options);

		expect(result).toContain("Updated Title");
		expect(result).toContain("Updated Header");
		expect(result).toContain("Updated content");
		expect(result).toContain('class="old-class new-class"');
	});

	it("should handle transform with template reference", async () => {
		// Create template file
		const templateFile = `${testDir}/template.html`;
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

		// Create transform that uses template
		fs.writeFileSync(
			`${transformsDir}/01-copy-header.js`,
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

		const options: CLIOptions = {
			input: inputFile,
			transforms: transformsDir,
			reference: templateFile,
			noFormat: true,
		};

		const result = await transform(options);

		expect(result).toContain("Template Header");
	});

	it("should handle configuration object", async () => {
		// Create config file
		const configFile = `${testDir}/config.json`;
		fs.writeFileSync(
			configFile,
			JSON.stringify({
				siteName: "Test Site",
				version: "1.0.0",
			}),
		);

		// Create transform that uses config
		fs.writeFileSync(
			`${transformsDir}/01-use-config.js`,
			`
module.exports = {
	name: "use-config",
	transform: ({ document, config }) => {
		const title = document.querySelector("title");
		if (title && config) {
			title.textContent = config.siteName + " v" + config.version;
		}
	}
};
		`,
		);

		const options: CLIOptions = {
			input: inputFile,
			transforms: transformsDir,
			config: configFile,
			noFormat: true,
		};

		const result = await transform(options);

		expect(result).toContain("Test Site v1.0.0");
	});
});
