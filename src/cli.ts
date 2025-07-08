#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import { glob } from "glob";
import { consola } from "consola";
import { transform } from "./core/transformer";
import type { CLIOptions, ResolvedOptions, TransformConfig } from "./types";
import { findConfigFile, loadConfig } from "./utils/config";
import {
	handleConfigError,
	validateInputPattern,
	validateOutputDirectory,
	validateRequired,
} from "./utils/validation.js";

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
			consola.start("Starting HTML DOM transformation...");
			
			if (options.verbose) {
				consola.info("CLI Options:", options);
			}

			const resolved = await resolveOptions(options);

			if (resolved.verbose) {
				consola.info("Resolved options:", resolved);
			}

			// Find common input base path to preserve directory structure
			let inputBasePath = "";
			if (resolved.inputPattern) {
				// Extract base path from pattern (remove glob parts)
				const basePart = resolved.inputPattern.replace(/\/\*\*?.*$/, "");
				if (
					!options.input &&
					resolved.config.input &&
					!path.isAbsolute(resolved.inputPattern)
				) {
					inputBasePath = path.resolve(options.transforms, basePart);
				} else {
					inputBasePath = path.resolve(basePart);
				}
			}

			// Progress indication for multiple files
			if (resolved.input.length > 1) {
				consola.start(`Processing ${resolved.input.length} HTML files...`);
			}

			for (const inputFile of resolved.input) {
				const result = await transform({
					...resolved,
					input: inputFile,
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
							consola.info(`Created output directory: ${outputDirForFile}`);
						}
					}

					fs.writeFileSync(outputPath, result);
					consola.success(`${path.relative(process.cwd(), inputFile)} → ${path.relative(process.cwd(), outputPath)}`);
				} else {
					consola.box(`=== ${inputFile} ===\n${result}`);
				}
			}

			consola.success(`🎉 Transformation completed successfully (${resolved.input.length} files processed)`);
		} catch (error) {
			consola.error("Error during transformation:", error);
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
			consola.info(`📄 Config loaded from: ${path.relative(process.cwd(), configPath)}`);
		} catch (error) {
			handleConfigError(error, options.config);
		}
	} else if (!options.config) {
		throw new Error(
			`Config file (config.yaml, config.yml, or config.json) is required in transforms directory: ${options.transforms}`,
		);
	}

	// Resolve input files using glob - CLI options override config
	const inputPattern = validateRequired(
		options.input || config.input,
		"Input pattern (either via CLI option -i or config file)",
	);
	validateInputPattern(inputPattern);

	// If pattern is relative and comes from config, resolve it relative to transforms directory
	let resolvedPattern = inputPattern;
	if (!options.input && config.input && !path.isAbsolute(inputPattern)) {
		resolvedPattern = path.resolve(options.transforms, inputPattern);
	}

	const inputFiles = await glob(resolvedPattern);
	if (inputFiles.length === 0) {
		throw new Error(
			`No files found matching pattern: ${resolvedPattern} (original: ${inputPattern})`,
		);
	}

	// Resolve output directory - CLI options override config
	const outputDir = validateRequired(
		options.output || config.output,
		"Output directory (either via CLI option -o or config file)",
	);
	validateOutputDirectory(outputDir);

	let resolvedOutputDir = outputDir;
	if (!options.output && config.output && !path.isAbsolute(outputDir)) {
		resolvedOutputDir = path.resolve(options.transforms, outputDir);
	}

	// CLI options override config
	return {
		input: inputFiles,
		transforms: options.transforms,
		transformOrder: config.transforms || [],
		reference: options.reference || config.reference,
		outputDir: resolvedOutputDir,
		dryRun: options.dryRun ?? config.dryRun ?? false,
		verbose: options.verbose ?? config.verbose ?? false,
		noFormat: options.noFormat ?? config.noFormat ?? false,
		prettierConfig: options.prettierConfig || config.prettierConfig,
		inputPattern: inputPattern,
		config: config,
	};
}

program.parse();
