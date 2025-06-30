import { consola } from "consola";

export function validateRequired<T>(
	value: T | undefined | null,
	name: string,
): T {
	if (value === undefined || value === null) {
		throw new Error(`${name} is required`);
	}
	return value;
}

export function validateInputPattern(pattern: string): void {
	if (!pattern || pattern.trim() === "") {
		throw new Error("Input pattern cannot be empty");
	}
}

export function validateOutputDirectory(outputDir: string): void {
	if (!outputDir || outputDir.trim() === "") {
		throw new Error("Output directory cannot be empty");
	}
}

export function handleConfigError(error: unknown, configPath?: string): void {
	if (configPath) {
		// If config was explicitly specified, fail
		throw error;
	}
	// Otherwise, just warn
	consola.warn(`⚠️ Warning: Could not load config file: ${error}`);
}
