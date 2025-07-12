#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import { glob } from "glob";
import { transform } from "./core/transformer";
import type { CLIOptions, ResolvedOptions, TransformConfig } from "./types";
import { findConfigFile, loadConfig } from "./utils/config";
import {
	validateDirectory,
	validateFile,
	validateGlobPattern,
	validatePath,
} from "./utils/pathSecurity";
import { TransformValidator } from "./utils/transformValidator";
import {
	handleConfigError,
	validateInputPattern,
	validateOutputDirectory,
} from "./utils/validation.js";

const packageJson = require("../package.json");

const program = new Command();

program
	.name("html-transform")
	.description("Transform HTML files using jsdom and TypeScript transforms")
	.version(packageJson.version)
	.requiredOption("-i, --input <pattern>", "Input HTML file pattern (glob)")
	.requiredOption(
		"-t, --transforms <dir>",
		"Directory containing compiled transform files and config",
	)
	.option("-r, --reference <path>", "Reference template HTML file")
	.requiredOption("-o, --output <dir>", "Output directory path")
	.option("-c, --config <path>", "Configuration file path")
	.option("--dry-run", "Run without writing files")
	.option("--verbose", "Enable verbose logging")
	.option("--no-format", "Skip Prettier formatting")
	.option("--prettier-config <path>", "Custom Prettier config file")
	.option("--skip-security-check", "Skip security validation of transform files")
	.option("--security-only", "Only run security analysis without executing transforms")
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

			// Handle security-only mode
			if (resolved.securityOnly) {
				console.log("Running security analysis only...");
				const results = await TransformValidator.batchValidate(resolved.transforms);
				const summary = TransformValidator.getBatchSummary(results);
				
				console.log("\n=== Security Analysis Results ===");
				console.log(`Total files analyzed: ${summary.total}`);
				console.log(`Safe files: ${summary.safe}`);
				console.log(`Unsafe files: ${summary.unsafe}`);
				console.log(`Average risk score: ${summary.averageRiskScore}/10`);
				
				if (summary.highestRiskFile) {
					console.log(`Highest risk file: ${summary.highestRiskFile} (${summary.highestRiskScore}/10)`);
				}
				
				console.log("\n=== Detailed Results ===");
				for (const [fileName, analysis] of results) {
					console.log(`\n${fileName}:`);
					console.log(`  Safe: ${analysis.safe ? "✓" : "✗"}`);
					console.log(`  Risk Score: ${analysis.riskScore}/10`);
					console.log(`  Structure Valid: ${analysis.structureValid ? "✓" : "✗"}`);
					
					if (analysis.warnings.length > 0) {
						console.log("  Warnings:");
						analysis.warnings.forEach(warning => console.log(`    - ${warning}`));
					}
					
					if (analysis.blockedPatterns.length > 0) {
						console.log("  Blocked Patterns:");
						analysis.blockedPatterns.forEach(pattern => console.log(`    - ${pattern}`));
					}
				}
				
				if (summary.unsafe > 0) {
					process.exit(1);
				}
				return;
			}

			// Find common input base path to preserve directory structure
			let inputBasePath = "";
			if (resolved.inputPattern) {
				// Extract base path from pattern (remove glob parts)
				const basePart = resolved.inputPattern.replace(/\/\*\*?.*$/, "");
				inputBasePath = path.resolve(basePart);

				// If basePart is a file (no glob patterns), use its directory as the base
				if (basePart === resolved.inputPattern && resolved.input.length === 1) {
					inputBasePath = path.dirname(inputBasePath);
				}
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
	// Validate and secure transforms directory path
	const secureTransformsDir = validateDirectory(options.transforms);

	// Find config file
	const configPath = options.config || findConfigFile(secureTransformsDir);
	let config: Partial<TransformConfig> = {};

	if (configPath) {
		try {
			// Validate config file path
			const secureConfigPath = validateFile(configPath);
			config = loadConfig(secureConfigPath);
			if (options.verbose) {
				console.log(`Loaded config from: ${secureConfigPath}`);
			}
		} catch (error) {
			handleConfigError(error, options.config);
		}
	} else if (!options.config) {
		throw new Error(
			`Config file (config.yaml, config.yml, or config.json) is required in transforms directory: ${secureTransformsDir}`,
		);
	}

	// Resolve input files using glob - CLI options only
	const inputPattern = options.input;
	validateInputPattern(inputPattern);

	// For relative patterns, resolve from current working directory
	let resolvedPattern = inputPattern;
	if (!path.isAbsolute(inputPattern)) {
		// Validate relative pattern for security (no path traversal)
		const securePattern = validateGlobPattern(inputPattern, process.cwd());
		resolvedPattern = path.resolve(process.cwd(), securePattern);
	} else {
		// For absolute patterns, validate base path
		const basePath = path.dirname(resolvedPattern);
		validatePath(basePath);
	}

	const inputFiles = await glob(resolvedPattern);
	if (inputFiles.length === 0) {
		throw new Error(
			`No files found matching pattern: ${resolvedPattern} (original: ${inputPattern})`,
		);
	}

	// Validate each found input file
	const secureInputFiles = inputFiles.map((file) => validateFile(file));

	// Resolve output directory - CLI options only
	const outputDir = options.output;
	validateOutputDirectory(outputDir);

	// Validate output directory path
	let resolvedOutputDir = outputDir;
	if (!path.isAbsolute(outputDir)) {
		// Validate relative pattern for security (no path traversal)
		validateGlobPattern(outputDir, process.cwd());
		resolvedOutputDir = path.resolve(process.cwd(), outputDir);
	}
	const secureOutputDir = validateDirectory(resolvedOutputDir);

	// Validate reference file if provided
	let secureReference: string | undefined;
	if (options.reference || config.reference) {
		const refPath = options.reference || config.reference;
		if (refPath) {
			secureReference = validateFile(refPath);
		}
	}

	// CLI options override config
	return {
		input: secureInputFiles,
		transforms: secureTransformsDir,
		transformOrder: config.transforms || [],
		reference: secureReference,
		outputDir: secureOutputDir,
		dryRun: options.dryRun ?? config.dryRun ?? false,
		verbose: options.verbose ?? config.verbose ?? false,
		noFormat: options.noFormat ?? config.noFormat ?? false,
		prettierConfig: options.prettierConfig || config.prettierConfig,
		inputPattern: inputPattern,
		config: config,
		skipSecurityCheck: options.skipSecurityCheck ?? false,
		securityOnly: options.securityOnly ?? false,
	};
}

program.parse();
