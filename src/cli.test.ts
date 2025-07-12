import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Helper function for running CLI commands
async function runCLI(
	args: string[],
): Promise<{ code: number | null; stdout: string; stderr: string }> {
	return new Promise<{ code: number | null; stdout: string; stderr: string }>(
		(resolve, reject) => {
			const child = spawn("node", ["dist/cli.js", ...args], {
				stdio: ["pipe", "pipe", "pipe"],
			});

			let stdout = "";
			let stderr = "";

			child.stdout?.on("data", (data) => {
				stdout += data.toString();
			});

			child.stderr?.on("data", (data) => {
				stderr += data.toString();
			});

			child.on("close", (code) => {
				resolve({ code, stdout, stderr });
			});

			child.on("error", (error) => {
				reject(error);
			});
		},
	);
}

describe("CLI", () => {
	let testDir: string;
	let inputFile: string;
	let outputFile: string;
	let transformsDir: string;

	beforeEach(() => {
		// Create test directory structure using temporary directory
		testDir = fs.mkdtempSync(path.join(os.tmpdir(), "html-transform-cli-test-"));
		inputFile = path.join(testDir, "input.html");
		const outputDir = path.join(testDir, "output");
		outputFile = path.join(outputDir, "input.html");
		transformsDir = path.join(testDir, "transforms");
		
		fs.mkdirSync(transformsDir, { recursive: true });
		fs.mkdirSync(outputDir, { recursive: true });

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
</body>
</html>
		`,
		);

		// Create config file
		fs.writeFileSync(
			`${transformsDir}/config.yaml`,
			`
transforms:
  - "update.js"
input: "${inputFile}"
output: "${outputDir}"
verbose: false
noFormat: true
		`,
		);

		// Create test transform
		fs.writeFileSync(
			`${transformsDir}/update.js`,
			`
module.exports = {
	name: "update-title",
	transform: ({ document }) => {
		const title = document.querySelector("title");
		if (title) {
			title.textContent = "Updated Title";
		}
		const h1 = document.querySelector("h1");
		if (h1) {
			h1.textContent = "Updated Header";
		}
	}
};
		`,
		);
	});

	afterEach(() => {
		// Clean up test files
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	it("should process HTML file with transforms", async () => {
		const args = ["-t", transformsDir];

		const result = await runCLI(args);

		expect(result.code).toBe(0);
		expect(fs.existsSync(outputFile)).toBe(true);

		const output = fs.readFileSync(outputFile, "utf-8");
		expect(output).toContain("Updated Title");
		expect(output).toContain("Updated Header");
	}, 10000);

	it("should show help when --help flag is used", async () => {
		const result = await runCLI(["--help"]);

		expect(result.code).toBe(0);
		expect(result.stdout).toContain("Transform HTML files using jsdom");
		expect(result.stdout).toContain("--input");
		expect(result.stdout).toContain("--transforms");
	}, 5000);

	it("should show version when --version flag is used", async () => {
		const result = await runCLI(["--version"]);

		expect(result.code).toBe(0);
		expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
	}, 5000);
});
