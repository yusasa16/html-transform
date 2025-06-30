import fs from "node:fs";

export function ensureFileExists(filePath: string): void {
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}
}

export function loadFile(filePath: string): string {
	ensureFileExists(filePath);
	try {
		return fs.readFileSync(filePath, "utf-8");
	} catch (error) {
		throw new Error(`Failed to read file ${filePath}: ${error}`);
	}
}

export function ensureDirectoryExists(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		throw new Error(`Directory not found: ${dirPath}`);
	}
}

export function listFiles(dirPath: string, extensions: string[]): string[] {
	ensureDirectoryExists(dirPath);
	try {
		return fs
			.readdirSync(dirPath)
			.filter((file) => extensions.some((ext) => file.endsWith(ext)));
	} catch (error) {
		throw new Error(`Failed to read directory ${dirPath}: ${error}`);
	}
}
