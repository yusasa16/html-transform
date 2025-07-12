import fs from "node:fs";
import { validateDirectory, validateFile } from "./pathSecurity";

export function ensureFileExists(filePath: string): void {
	const secureFilePath = validateFile(filePath);
	if (!fs.existsSync(secureFilePath)) {
		throw new Error(`File not found: ${filePath}`);
	}
}

export function loadFile(filePath: string): string {
	const secureFilePath = validateFile(filePath);
	try {
		return fs.readFileSync(secureFilePath, "utf-8");
	} catch (error) {
		throw new Error(`Failed to read file ${filePath}: ${error}`);
	}
}

export function ensureDirectoryExists(dirPath: string): void {
	const secureDir = validateDirectory(dirPath);
	if (!fs.existsSync(secureDir)) {
		throw new Error(`Directory not found: ${dirPath}`);
	}
	const stats = fs.statSync(secureDir);
	if (!stats.isDirectory()) {
		throw new Error(`Directory not found: ${dirPath}`);
	}
}

export function listFiles(dirPath: string, extensions: string[]): string[] {
	const secureDir = validateDirectory(dirPath);
	try {
		return fs
			.readdirSync(secureDir)
			.filter((file) => extensions.some((ext) => file.endsWith(ext)));
	} catch (error) {
		throw new Error(`Failed to read directory ${dirPath}: ${error}`);
	}
}
