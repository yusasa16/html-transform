import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getAllowedExtensions,
	getBlockedPatterns,
	isExtensionAllowed,
	isPathBlocked,
	validateDirectory,
	validateExtension,
	validateFile,
	validateGlobPattern,
	validatePath,
} from "./pathSecurity";

// Mock fs module
vi.mock("node:fs");
const mockFs = vi.mocked(fs);

describe("pathSecurity", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock console.warn to avoid test output pollution
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	describe("isPathBlocked", () => {
		it("should detect path traversal", () => {
			expect(isPathBlocked("../etc/passwd")).toBe(true);
			expect(isPathBlocked("../../secret")).toBe(true);
			expect(isPathBlocked("./safe/path")).toBe(false);
		});

		it("should detect system directories", () => {
			expect(isPathBlocked("/etc/passwd")).toBe(true);
			expect(isPathBlocked("/usr/bin/node")).toBe(true);
			expect(isPathBlocked("/root/.bashrc")).toBe(true);
			expect(isPathBlocked("/home/user/safe.html")).toBe(false);
		});

		it("should detect sensitive files", () => {
			expect(isPathBlocked("/home/user/.ssh/id_rsa")).toBe(true);
			expect(isPathBlocked("/app/.aws/credentials")).toBe(true);
			expect(isPathBlocked("/project/.env")).toBe(true);
			expect(isPathBlocked("/certs/server.key")).toBe(true);
		});
	});

	describe("validatePath", () => {
		it("should validate input parameters", () => {
			expect(() => validatePath("")).toThrow("Invalid path");
			expect(() => validatePath(null as unknown as string)).toThrow("Invalid path");
			expect(() => validatePath(123 as unknown as string)).toThrow("Invalid path");
		});

		it("should block dangerous paths", () => {
			expect(() => validatePath("../etc/passwd")).toThrow("Access denied");
			expect(() => validatePath("/root/.bashrc")).toThrow("Access denied");
			expect(() => validatePath(".ssh/id_rsa")).toThrow("Access denied");
		});

		it("should resolve safe paths", () => {
			const result = validatePath("safe/file.html");
			expect(result).toBe(path.resolve("safe/file.html"));
		});

		it("should enforce base path restrictions", () => {
			const basePath = "/safe/project";

			expect(() => validatePath("../../../etc/passwd", basePath)).toThrow(
				"Access denied",
			);
			expect(() => validatePath("/etc/passwd", basePath)).toThrow(
				"Access denied",
			);

			const safePath = validatePath("subfolder/file.html", basePath);
			expect(safePath).toBe(path.resolve(basePath, "subfolder/file.html"));
		});
	});

	describe("isExtensionAllowed", () => {
		it("should allow valid extensions", () => {
			expect(isExtensionAllowed("file.html")).toBe(true);
			expect(isExtensionAllowed("config.json")).toBe(true);
			expect(isExtensionAllowed("transform.ts")).toBe(true);
			expect(isExtensionAllowed("template.htm")).toBe(true);
		});

		it("should block invalid extensions", () => {
			expect(isExtensionAllowed("script.sh")).toBe(false);
			expect(isExtensionAllowed("binary.exe")).toBe(false);
			expect(isExtensionAllowed("data.sql")).toBe(false);
		});

		it("should be case insensitive", () => {
			expect(isExtensionAllowed("FILE.HTML")).toBe(true);
			expect(isExtensionAllowed("CONFIG.JSON")).toBe(true);
		});
	});

	describe("validateExtension", () => {
		it("should validate input parameters", () => {
			expect(() => validateExtension("")).toThrow("Invalid file path");
			expect(() => validateExtension(null as unknown as string)).toThrow("Invalid file path");
		});

		it("should require file extension", () => {
			expect(() => validateExtension("noextension")).toThrow(
				"File must have an extension",
			);
		});

		it("should allow valid extensions", () => {
			expect(() => validateExtension("file.html")).not.toThrow();
			expect(() => validateExtension("config.json")).not.toThrow();
		});

		it("should block invalid extensions", () => {
			expect(() => validateExtension("script.sh")).toThrow(
				"File extension not allowed",
			);
			expect(() => validateExtension("binary.exe")).toThrow(
				"File extension not allowed",
			);
		});
	});

	describe("validateDirectory", () => {
		it("should validate input parameters", () => {
			expect(() => validateDirectory("")).toThrow("Invalid directory path");
			expect(() => validateDirectory(null as unknown as string)).toThrow(
				"Invalid directory path",
			);
		});

		it("should check directory existence", () => {
			mockFs.existsSync.mockReturnValue(false);
			expect(() => validateDirectory("/nonexistent")).toThrow(
				"Requested directory does not exist",
			);
		});

		it("should verify path is a directory", () => {
			mockFs.existsSync.mockReturnValue(true);
			mockFs.statSync.mockReturnValue({
				isDirectory: () => false,
			} as fs.Stats);

			expect(() => validateDirectory("/actually/a/file")).toThrow(
				"Requested path is not a directory",
			);
		});

		it("should return validated directory path", () => {
			mockFs.existsSync.mockReturnValue(true);
			mockFs.statSync.mockReturnValue({
				isDirectory: () => true,
			} as fs.Stats);

			const result = validateDirectory("/safe/directory");
			expect(result).toBe(path.resolve("/safe/directory"));
		});
	});

	describe("validateFile", () => {
		it("should validate file existence and type", () => {
			mockFs.existsSync.mockReturnValue(true);
			mockFs.statSync.mockReturnValue({
				isFile: () => true,
			} as fs.Stats);
			mockFs.accessSync.mockImplementation(() => {}); // No error = readable

			const result = validateFile("/safe/file.html");
			expect(result).toBe(path.resolve("/safe/file.html"));
		});

		it("should check file readability", () => {
			mockFs.existsSync.mockReturnValue(true);
			mockFs.statSync.mockReturnValue({
				isFile: () => true,
			} as fs.Stats);
			mockFs.accessSync.mockImplementation(() => {
				throw new Error("Permission denied");
			});

			expect(() => validateFile("/unreadable/file.html")).toThrow(
				"Requested file is not accessible",
			);
		});
	});

	describe("validateGlobPattern", () => {
		it("should validate input parameters", () => {
			expect(() => validateGlobPattern("", "/base")).toThrow(
				"Invalid glob pattern",
			);
			expect(() => validateGlobPattern(null as unknown as string, "/base")).toThrow(
				"Invalid glob pattern",
			);
		});

		it("should reject patterns with excessive path traversal", () => {
			expect(() =>
				validateGlobPattern("../../../../../../../../safe/*.txt", "/base"),
			).toThrow("excessive path traversal");
		});

		it("should reject patterns accessing blocked paths", () => {
			expect(() => validateGlobPattern("../../etc/*.conf", "/safe")).toThrow(
				"blocked path",
			);
		});

		it("should allow safe glob patterns", () => {
			const result = validateGlobPattern("**/*.html", "/safe/base");
			expect(result).toBe("**/*.html");
		});

		it("should allow safe relative patterns", () => {
			const result = validateGlobPattern(
				"../input/**/*.html",
				"/project/transforms",
			);
			expect(result).toBe("../input/**/*.html");
		});
	});

	describe("utility functions", () => {
		it("should return allowed extensions", () => {
			const extensions = getAllowedExtensions();
			expect(extensions).toContain(".html");
			expect(extensions).toContain(".ts");
			expect(extensions).toContain(".json");
		});

		it("should return blocked patterns", () => {
			const patterns = getBlockedPatterns();
			expect(patterns.length).toBeGreaterThan(0);
			expect(patterns.some((p) => p.test("../traversal"))).toBe(true);
		});
	});

	describe("security scenarios", () => {
		it("should block common attack vectors", () => {
			const attackVectors = [
				"../../../etc/passwd",
				"/etc/shadow",
				"~/.ssh/id_rsa",
				".env",
				"server.key",
				"/root/.bashrc",
				"/proc/self/environ",
			];

			attackVectors.forEach((vector) => {
				expect(() => validatePath(vector)).toThrow("Access denied");
			});
		});

		it("should allow legitimate file operations", () => {
			const legitimatePaths = [
				"./templates/header.html",
				"transforms/01-update-title.ts",
				"config/settings.json",
				"output/processed.html",
			];

			legitimatePaths.forEach((path) => {
				expect(() => validatePath(path)).not.toThrow();
			});
		});
	});
});
