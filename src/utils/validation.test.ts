import { describe, expect, it, vi } from "vitest";
import {
	handleConfigError,
	validateInputPattern,
	validateOutputDirectory,
	validateRequired,
} from "./validation";

describe("validation utils", () => {
	describe("validateRequired", () => {
		it("should return value when not null or undefined", () => {
			expect(validateRequired("test", "field")).toBe("test");
			expect(validateRequired(0, "field")).toBe(0);
			expect(validateRequired(false, "field")).toBe(false);
			expect(validateRequired([], "field")).toEqual([]);
			expect(validateRequired({}, "field")).toEqual({});
		});

		it("should throw error for undefined", () => {
			expect(() => validateRequired(undefined, "test field")).toThrow(
				"test field is required",
			);
		});

		it("should throw error for null", () => {
			expect(() => validateRequired(null, "test field")).toThrow(
				"test field is required",
			);
		});

		it("should handle different field names", () => {
			expect(() => validateRequired(undefined, "input pattern")).toThrow(
				"input pattern is required",
			);
			expect(() => validateRequired(null, "output directory")).toThrow(
				"output directory is required",
			);
		});
	});

	describe("validateInputPattern", () => {
		it("should not throw for valid patterns", () => {
			expect(() => validateInputPattern("*.html")).not.toThrow();
			expect(() => validateInputPattern("src/**/*.html")).not.toThrow();
			expect(() => validateInputPattern("input/file.html")).not.toThrow();
			expect(() => validateInputPattern("a")).not.toThrow();
		});

		it("should throw error for empty string", () => {
			expect(() => validateInputPattern("")).toThrow(
				"Input pattern cannot be empty",
			);
		});

		it("should throw error for whitespace-only string", () => {
			expect(() => validateInputPattern("   ")).toThrow(
				"Input pattern cannot be empty",
			);
			expect(() => validateInputPattern("\t\n")).toThrow(
				"Input pattern cannot be empty",
			);
		});
	});

	describe("validateOutputDirectory", () => {
		it("should not throw for valid directories", () => {
			expect(() => validateOutputDirectory("output")).not.toThrow();
			expect(() => validateOutputDirectory("dist/build")).not.toThrow();
			expect(() => validateOutputDirectory("/absolute/path")).not.toThrow();
			expect(() => validateOutputDirectory("./relative")).not.toThrow();
			expect(() => validateOutputDirectory("a")).not.toThrow();
		});

		it("should throw error for empty string", () => {
			expect(() => validateOutputDirectory("")).toThrow(
				"Output directory cannot be empty",
			);
		});

		it("should throw error for whitespace-only string", () => {
			expect(() => validateOutputDirectory("   ")).toThrow(
				"Output directory cannot be empty",
			);
			expect(() => validateOutputDirectory("\t\n")).toThrow(
				"Output directory cannot be empty",
			);
		});
	});

	describe("handleConfigError", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("should throw error when configPath is provided", () => {
			const error = new Error("Config file error");

			expect(() => handleConfigError(error, "config.yaml")).toThrow(
				"Config file error",
			);
		});

		it("should log warning when configPath is not provided", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const error = new Error("Config file error");

			expect(() => handleConfigError(error)).not.toThrow();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Warning: Could not load config file: Error: Config file error",
			);

			consoleSpy.mockRestore();
		});

		it("should log warning when configPath is undefined", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const error = new Error("Another error");

			expect(() => handleConfigError(error, undefined)).not.toThrow();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Warning: Could not load config file: Error: Another error",
			);

			consoleSpy.mockRestore();
		});

		it("should handle non-Error objects", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const error = "String error";

			expect(() => handleConfigError(error)).not.toThrow();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Warning: Could not load config file: String error",
			);

			consoleSpy.mockRestore();
		});

		it("should rethrow exact error when configPath is provided", () => {
			const originalError = new Error("Original error message");

			expect(() => handleConfigError(originalError, "explicit-config.json")).toThrow(originalError);
		});
	});
});