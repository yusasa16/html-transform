import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type { TransformConfig } from "../types";
import { ensureFileExists, loadFile } from "./fileLoader.js";

export function loadConfig(configPath: string): TransformConfig {
	const ext = path.extname(configPath).toLowerCase();
	const content = loadFile(configPath);

	let config: TransformConfig;

	try {
		if (ext === ".yaml" || ext === ".yml") {
			config = yaml.load(content) as TransformConfig;
		} else if (ext === ".json") {
			config = JSON.parse(content);
		} else {
			throw new Error(`Unsupported config file format: ${ext}`);
		}
	} catch (error) {
		throw new Error(`Failed to parse config file: ${error}`);
	}

	return config;
}

export function findConfigFile(transformsDir: string): string | null {
	const configFiles = ["config.yaml", "config.yml", "config.json"];

	for (const configFile of configFiles) {
		const configPath = path.join(transformsDir, configFile);
		if (fs.existsSync(configPath)) {
			return configPath;
		}
	}

	return null;
}
