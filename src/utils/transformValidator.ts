import * as fs from "node:fs";
import * as crypto from "node:crypto";
import * as path from "node:path";

export interface SecurityAnalysis {
	safe: boolean;
	riskScore: number; // 0-10 scale
	warnings: string[];
	blockedPatterns: string[];
	hash: string;
	structureValid: boolean;
}

export interface DangerousPattern {
	pattern: RegExp;
	description: string;
	severity: "low" | "medium" | "high" | "critical";
	riskPoints: number;
}

export class TransformValidator {
	private static readonly DANGEROUS_PATTERNS: DangerousPattern[] = [
		// System module imports
		{
			pattern: /require\s*\(\s*['"`]child_process['"`]\s*\)/g,
			description: "child_process module import",
			severity: "critical",
			riskPoints: 10,
		},
		{
			pattern: /import\s+.*from\s+['"`]child_process['"`]/g,
			description: "child_process module import",
			severity: "critical",
			riskPoints: 10,
		},
		{
			pattern: /require\s*\(\s*['"`]fs['"`]\s*\)/g,
			description: "fs module import",
			severity: "high",
			riskPoints: 8,
		},
		{
			pattern: /import\s+.*from\s+['"`]fs['"`]/g,
			description: "fs module import",
			severity: "high",
			riskPoints: 8,
		},
		{
			pattern: /require\s*\(\s*['"`]node:fs['"`]\s*\)/g,
			description: "node:fs module import",
			severity: "high",
			riskPoints: 8,
		},
		{
			pattern: /import\s+.*from\s+['"`]node:fs['"`]/g,
			description: "node:fs module import",
			severity: "high",
			riskPoints: 8,
		},
		{
			pattern: /require\s*\(\s*['"`]os['"`]\s*\)/g,
			description: "os module import",
			severity: "medium",
			riskPoints: 6,
		},
		{
			pattern: /import\s+.*from\s+['"`]os['"`]/g,
			description: "os module import",
			severity: "medium",
			riskPoints: 6,
		},
		{
			pattern: /require\s*\(\s*['"`]path['"`]\s*\)/g,
			description: "path module import",
			severity: "low",
			riskPoints: 2,
		},
		{
			pattern: /import\s+.*from\s+['"`]path['"`]/g,
			description: "path module import",
			severity: "low",
			riskPoints: 2,
		},
		
		// Dangerous function calls
		{
			pattern: /\beval\s*\(/g,
			description: "eval() function call",
			severity: "critical",
			riskPoints: 10,
		},
		{
			pattern: /new\s+Function\s*\(/g,
			description: "Function constructor",
			severity: "critical",
			riskPoints: 10,
		},
		{
			pattern: /\.exec\s*\(/g,
			description: "exec() function call",
			severity: "critical",
			riskPoints: 10,
		},
		{
			pattern: /\.spawn\s*\(/g,
			description: "spawn() function call",
			severity: "critical",
			riskPoints: 10,
		},
		{
			pattern: /\.execSync\s*\(/g,
			description: "execSync() function call",
			severity: "critical",
			riskPoints: 10,
		},
		
		// Network operations
		{
			pattern: /fetch\s*\(/g,
			description: "fetch() network call",
			severity: "medium",
			riskPoints: 5,
		},
		{
			pattern: /XMLHttpRequest/g,
			description: "XMLHttpRequest usage",
			severity: "medium",
			riskPoints: 5,
		},
		{
			pattern: /require\s*\(\s*['"`]https?['"`]\s*\)/g,
			description: "HTTP/HTTPS module import",
			severity: "medium",
			riskPoints: 6,
		},
		{
			pattern: /import\s+.*from\s+['"`]https?['"`]/g,
			description: "HTTP/HTTPS module import",
			severity: "medium",
			riskPoints: 6,
		},
		
		// File system operations
		{
			pattern: /\.writeFile\s*\(/g,
			description: "writeFile() function call",
			severity: "high",
			riskPoints: 8,
		},
		{
			pattern: /\.readFile\s*\(/g,
			description: "readFile() function call",
			severity: "high",
			riskPoints: 7,
		},
		{
			pattern: /\.writeFileSync\s*\(/g,
			description: "writeFileSync() function call",
			severity: "high",
			riskPoints: 8,
		},
		{
			pattern: /\.readFileSync\s*\(/g,
			description: "readFileSync() function call",
			severity: "high",
			riskPoints: 7,
		},
		{
			pattern: /\.unlink\s*\(/g,
			description: "unlink() function call",
			severity: "high",
			riskPoints: 8,
		},
		{
			pattern: /\.mkdir\s*\(/g,
			description: "mkdir() function call",
			severity: "medium",
			riskPoints: 6,
		},
		{
			pattern: /\.rmdir\s*\(/g,
			description: "rmdir() function call",
			severity: "high",
			riskPoints: 8,
		},
		
		// Process manipulation
		{
			pattern: /process\.env/g,
			description: "process.env access",
			severity: "medium",
			riskPoints: 5,
		},
		{
			pattern: /process\.exit\s*\(/g,
			description: "process.exit() call",
			severity: "medium",
			riskPoints: 6,
		},
		{
			pattern: /process\.kill\s*\(/g,
			description: "process.kill() call",
			severity: "high",
			riskPoints: 8,
		},
		{
			pattern: /process\.chdir\s*\(/g,
			description: "process.chdir() call",
			severity: "medium",
			riskPoints: 6,
		},
		
		// Dynamic code execution
		{
			pattern: /require\s*\(\s*[^'"`]/g,
			description: "Dynamic require() call",
			severity: "high",
			riskPoints: 7,
		},
		{
			pattern: /import\s*\(\s*[^'"`]/g,
			description: "Dynamic import() call",
			severity: "medium",
			riskPoints: 5,
		},
		
		// Browser APIs that could be dangerous
		{
			pattern: /localStorage/g,
			description: "localStorage access",
			severity: "low",
			riskPoints: 2,
		},
		{
			pattern: /sessionStorage/g,
			description: "sessionStorage access",
			severity: "low",
			riskPoints: 2,
		},
		{
			pattern: /document\.cookie/g,
			description: "document.cookie access",
			severity: "medium",
			riskPoints: 4,
		},
	];

	private static readonly MAX_RISK_SCORE = 10;
	private static readonly RISK_THRESHOLD = 7; // Above this is considered unsafe

	/**
	 * Analyze a transform file for security risks
	 */
	public static async analyzeFile(filePath: string): Promise<SecurityAnalysis> {
		try {
			const content = await fs.promises.readFile(filePath, "utf-8");
			return TransformValidator.analyzeContent(content, filePath);
		} catch (error) {
			throw new Error(`Failed to read transform file ${filePath}: ${error}`);
		}
	}

	/**
	 * Analyze transform content for security risks
	 */
	public static analyzeContent(content: string, _filePath?: string): SecurityAnalysis {
		const warnings: string[] = [];
		const blockedPatterns: string[] = [];
		let totalRiskPoints = 0;

		// Check for dangerous patterns
		for (const pattern of TransformValidator.DANGEROUS_PATTERNS) {
			const matches = content.match(pattern.pattern);
			if (matches) {
				const description = `${pattern.description} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`;
				warnings.push(description);
				
				if (pattern.severity === "critical" || pattern.severity === "high") {
					blockedPatterns.push(description);
				}
				
				// Add risk points, but cap individual pattern contribution
				totalRiskPoints += Math.min(pattern.riskPoints * matches.length, pattern.riskPoints * 2);
			}
		}

		// Calculate risk score (0-10 scale)
		const riskScore = Math.min(totalRiskPoints, TransformValidator.MAX_RISK_SCORE);
		
		// Validate transform structure
		const structureValid = TransformValidator.validateTransformStructure(content);
		if (!structureValid) {
			warnings.push("Invalid transform structure: missing required export or transform function");
			totalRiskPoints += 3;
		}

		// Calculate file hash
		const hash = crypto.createHash("sha256").update(content).digest("hex");

		// Determine if transform is safe
		const safe = riskScore < TransformValidator.RISK_THRESHOLD && blockedPatterns.length === 0 && structureValid;

		return {
			safe,
			riskScore: Math.round(riskScore * 10) / 10, // Round to 1 decimal place
			warnings,
			blockedPatterns,
			hash,
			structureValid,
		};
	}

	/**
	 * Validate that the transform has the required structure
	 */
	public static validateTransformStructure(content: string): boolean {
		// Check for export default or module.exports
		const hasDefaultExport = /export\s+default\s+/g.test(content);
		const hasModuleExports = /module\.exports\s*=/g.test(content);
		
		if (!hasDefaultExport && !hasModuleExports) {
			return false;
		}

		// Check for transform function (more flexible patterns)
		const hasTransformFunction = 
			/transform\s*:\s*(?:async\s+)?\s*(?:function\s*)?\(/g.test(content) ||
			/transform\s*:\s*(?:async\s+)?\s*\(/g.test(content) ||
			/transform\s*=\s*(?:async\s+)?\s*(?:function\s*)?\(/g.test(content) ||
			/transform:\s*function/g.test(content) ||
			/transform\s*:\s*\(\s*{\s*\w+\s*}\s*\)\s*=>/g.test(content);
		
		return hasTransformFunction;
	}

	/**
	 * Batch validate multiple transform files
	 */
	public static async batchValidate(transformDir: string): Promise<Map<string, SecurityAnalysis>> {
		const results = new Map<string, SecurityAnalysis>();
		
		try {
			const files = await fs.promises.readdir(transformDir);
			const transformFiles = files.filter(file => 
				file.endsWith(".ts") || file.endsWith(".js")
			);

			for (const file of transformFiles) {
				const filePath = path.join(transformDir, file);
				try {
					const analysis = await TransformValidator.analyzeFile(filePath);
					results.set(file, analysis);
				} catch (error) {
					// Create error analysis for failed files
					results.set(file, {
						safe: false,
						riskScore: 10,
						warnings: [`Failed to analyze: ${error}`],
						blockedPatterns: ["Analysis failed"],
						hash: "",
						structureValid: false,
					});
				}
			}
		} catch (error) {
			throw new Error(`Failed to read transform directory ${transformDir}: ${error}`);
		}

		return results;
	}

	/**
	 * Get summary statistics for batch validation results
	 */
	public static getBatchSummary(results: Map<string, SecurityAnalysis>): {
		total: number;
		safe: number;
		unsafe: number;
		averageRiskScore: number;
		highestRiskFile?: string;
		highestRiskScore: number;
	} {
		const total = results.size;
		let safe = 0;
		let unsafe = 0;
		let totalRiskScore = 0;
		let highestRiskFile: string | undefined;
		let highestRiskScore = 0;

		for (const [fileName, analysis] of results) {
			if (analysis.safe) {
				safe++;
			} else {
				unsafe++;
			}
			
			totalRiskScore += analysis.riskScore;
			
			if (analysis.riskScore > highestRiskScore) {
				highestRiskScore = analysis.riskScore;
				highestRiskFile = fileName;
			}
		}

		return {
			total,
			safe,
			unsafe,
			averageRiskScore: total > 0 ? Math.round((totalRiskScore / total) * 10) / 10 : 0,
			highestRiskFile,
			highestRiskScore,
		};
	}
}