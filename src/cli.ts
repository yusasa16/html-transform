#!/usr/bin/env node
import { Command } from "commander";
import { transform } from "./core/transformer";
import { glob } from "glob";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig, findConfigFile } from "./utils/config";
import type { CLIOptions, ResolvedOptions, TransformConfig } from "./types";

const packageJson = require("../package.json");

const program = new Command();

program
	.name("html-transform")
	.description("Transform HTML files using jsdom and TypeScript transforms")
	.version(packageJson.version)
	.option("-i, --input <pattern>", "Input HTML file pattern (glob)")
	.requiredOption(
		"-t, --transforms <dir>",
		"Directory containing compiled transform files and config",
	)
	.option("-r, --reference <path>", "Reference template HTML file")
	.option("-o, --output <dir>", "Output directory path")
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

			const resolved = await resolveOptions(options);
			
			if (resolved.verbose) {
				console.log("Resolved options:", resolved);
			}

			// Find common input base path to preserve directory structure
			let inputBasePath = '';
			if (resolved.inputPattern) {
				// Extract base path from pattern (remove glob parts)
				const basePart = resolved.inputPattern.replace(/\/\*\*?.*$/, '');
				if (!options.input && resolved.config.input && !path.isAbsolute(resolved.inputPattern)) {
					inputBasePath = path.resolve(options.transforms, basePart);
				} else {
					inputBasePath = path.resolve(basePart);
				}
			}

			for (const inputFile of resolved.input) {
				const result = await transform({
					...resolved,
					input: inputFile
				} as ResolvedOptions & { input: string });

				if (resolved.outputDir) {
					// Calculate relative path to preserve directory structure
					const relativePath = path.relative(inputBasePath, inputFile);
					const outputPath = path.join(resolved.outputDir, relativePath);
					const outputDirForFile = path.dirname(outputPath);
					
					// Ensure output directory exists for this file
					if (!fs.existsSync(outputDirForFile)) {
						fs.mkdirSync(outputDirForFile, { recursive: true });
						if (resolved.verbose) {
							console.log(`Created output directory: ${outputDirForFile}`);
						}
					}
					
					fs.writeFileSync(outputPath, result);
					if (resolved.verbose) {
						console.log(`Output written to: ${outputPath}`);
					}
				} else {
					console.log(`=== ${inputFile} ===`);
					console.log(result);
				}
			}

			if (options.verbose) {
				console.log("Transformation completed successfully");
			}
		} catch (error) {
			console.error("Error during transformation:", error);
			process.exit(1);
		}
	});

async function resolveOptions(options: CLIOptions): Promise<ResolvedOptions> {
	// Find config file
	const configPath = options.config || findConfigFile(options.transforms);
	let config: Partial<TransformConfig> = {};
	
	if (configPath) {
		try {
			config = loadConfig(configPath);
			if (options.verbose) {
				console.log(`Loaded config from: ${configPath}`);
			}
		} catch (error) {
			if (options.config) {
				// If config was explicitly specified, fail
				throw error;
			}
			// Otherwise, just warn
			console.warn(`Warning: Could not load config file: ${error}`);
		}
	} else if (!options.config) {
		throw new Error(`Config file (config.yaml, config.yml, or config.json) is required in transforms directory: ${options.transforms}`);
	}

	// Resolve input files using glob - CLI options override config
	const inputPattern = options.input || config.input;
	if (!inputPattern) {
		throw new Error("Input pattern is required either via CLI option (-i) or config file");
	}
	
	// If pattern is relative and comes from config, resolve it relative to transforms directory
	let resolvedPattern = inputPattern;
	if (!options.input && config.input && !path.isAbsolute(inputPattern)) {
		resolvedPattern = path.resolve(options.transforms, inputPattern);
	}
	
	const inputFiles = await glob(resolvedPattern);
	if (inputFiles.length === 0) {
		throw new Error(`No files found matching pattern: ${resolvedPattern} (original: ${inputPattern})`);
	}

	// Resolve output directory - CLI options override config
	let outputDir = options.output || config.output;
	if (!outputDir) {
		throw new Error("Output directory is required either via CLI option (-o) or config file");
	}
	if (!options.output && config.output && !path.isAbsolute(outputDir)) {
		outputDir = path.resolve(options.transforms, outputDir);
	}

	// CLI options override config
	return {
		input: inputFiles,
		transforms: options.transforms,
		transformOrder: config.transforms || [],
		reference: options.reference || config.reference,
		outputDir: outputDir,
		dryRun: options.dryRun ?? config.dryRun ?? false,
		verbose: options.verbose ?? config.verbose ?? false,
		noFormat: options.noFormat ?? config.noFormat ?? false,
		prettierConfig: options.prettierConfig || config.prettierConfig,
		inputPattern: inputPattern,
		config: config
	};
}

program.parse();
