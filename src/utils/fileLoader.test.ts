import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	ensureDirectoryExists,
	ensureFileExists,
	listFiles,
	loadFile,
} from "./fileLoader";

describe("fileLoader utils", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = fs.mkdtempSync(path.join(os.tmpdir(), "file-loader-test-"));
	});

	afterEach(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("ensureFileExists", () => {
		it("should not throw error for existing file", () => {
			const filePath = path.join(testDir, "test.html");
			fs.writeFileSync(filePath, "test content");

			expect(() => ensureFileExists(filePath)).not.toThrow();
		});

		it("should throw error for missing file", () => {
			const filePath = path.join(testDir, "missing.html");

			expect(() => ensureFileExists(filePath)).toThrow(
				"Requested file does not exist",
			);
		});
	});

	describe("loadFile", () => {
		it("should load file content", () => {
			const filePath = path.join(testDir, "test.html");
			const content = "Hello, World!";
			fs.writeFileSync(filePath, content);

			const result = loadFile(filePath);

			expect(result).toBe(content);
		});

		it("should throw error for missing file", () => {
			const filePath = path.join(testDir, "missing.html");

			expect(() => loadFile(filePath)).toThrow("Requested file does not exist");
		});

		it("should handle UTF-8 content", () => {
			const filePath = path.join(testDir, "utf8.html");
			const content = "日本語テスト";
			fs.writeFileSync(filePath, content, "utf-8");

			const result = loadFile(filePath);

			expect(result).toBe(content);
		});
	});

	describe("ensureDirectoryExists", () => {
		it("should not throw error for existing directory", () => {
			expect(() => ensureDirectoryExists(testDir)).not.toThrow();
		});

		it("should throw error for missing directory", () => {
			const dirPath = path.join(testDir, "missing-dir");

			expect(() => ensureDirectoryExists(dirPath)).toThrow(
				"Requested directory does not exist",
			);
		});

		it("should throw error when path is a file, not directory", () => {
			const filePath = path.join(testDir, "not-a-dir.html");
			fs.writeFileSync(filePath, "content");

			expect(() => ensureDirectoryExists(filePath)).toThrow(
				"Requested path is not a directory",
			);
		});
	});

	describe("listFiles", () => {
		beforeEach(() => {
			// Create test files
			fs.writeFileSync(path.join(testDir, "file1.ts"), "content");
			fs.writeFileSync(path.join(testDir, "file2.js"), "content");
			fs.writeFileSync(path.join(testDir, "file3.html"), "content");
			fs.writeFileSync(path.join(testDir, "readme.md"), "content");
		});

		it("should list TypeScript files", () => {
			const result = listFiles(testDir, [".ts"]);

			expect(result).toEqual(["file1.ts"]);
		});

		it("should list JavaScript files", () => {
			const result = listFiles(testDir, [".js"]);

			expect(result).toEqual(["file2.js"]);
		});

		it("should list multiple extensions", () => {
			const result = listFiles(testDir, [".ts", ".js"]);

			expect(result).toEqual(expect.arrayContaining(["file1.ts", "file2.js"]));
			expect(result).toHaveLength(2);
		});

		it("should return empty array when no matching files", () => {
			const result = listFiles(testDir, [".py"]);

			expect(result).toEqual([]);
		});

		it("should throw error for missing directory", () => {
			const missingDir = path.join(testDir, "missing");

			expect(() => listFiles(missingDir, [".ts"])).toThrow(
				"Requested directory does not exist",
			);
		});

		it("should handle directory with subdirectories", () => {
			const subDir = path.join(testDir, "subdir");
			fs.mkdirSync(subDir);
			fs.writeFileSync(path.join(subDir, "nested.ts"), "content");

			const result = listFiles(testDir, [".ts"]);

			// Should only list files in the direct directory, not subdirectories
			expect(result).toEqual(["file1.ts"]);
		});
	});
});
