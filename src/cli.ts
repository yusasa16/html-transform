#!/usr/bin/env node
import { Command } from "commander";
import { transform } from "./core/transformer";
import type { CLIOptions } from "./types";

const packageJson = require("../package.json");

const program = new Command();

program
	.name("html-transform")
	.description("Transform HTML files using jsdom and TypeScript transforms")
	.version(packageJson.version)
	.requiredOption("-i, --input <path>", "Input HTML file path")
	.requiredOption(
		"-t, --transforms <dir>",
		"Directory containing compiled transform files",
	)
	.option("-r, --reference <path>", "Reference template HTML file")
	.option("-o, --output <path>", "Output file path (default: stdout)")
	.option("-c, --config <path>", "Configuration file path")
	.option("--dry-run", "Run without writing files")
	.option("--verbose", "Enable verbose logging")
	.option("--no-format", "Skip Prettier formatting")
	.option("--prettier-config <path>", "Custom Prettier config file")
	.action(async (options: CLIOptions) => {
		try {
			if (options.verbose) {
				console.log("Starting HTML DOM transformation...");
				console.log("Options:", options);
			}

			const result = await transform(options);

			if (options.output) {
				const fs = require("node:fs");
				fs.writeFileSync(options.output, result);
				if (options.verbose) {
					console.log(`Output written to: ${options.output}`);
				}
			} else {
				console.log(result);
			}

			if (options.verbose) {
				console.log("Transformation completed successfully");
			}
		} catch (error) {
			console.error("Error during transformation:", error);
			process.exit(1);
		}
	});

program.parse();
