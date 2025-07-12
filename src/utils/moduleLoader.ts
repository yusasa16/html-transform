import path from "node:path";
import type { Transform } from "../types/index.js";
import { TransformValidator } from "./transformValidator.js";

export function loadModule<T>(filePath: string): T {
	const resolvedPath = path.resolve(filePath);

	try {
		if (filePath.endsWith(".ts")) {
			const { createJiti } = require("jiti");
			const jiti = createJiti(__filename, {
				interopDefault: true,
				transformOptions: {
					typescript: true,
				},
			});
			return jiti(resolvedPath) as T;
		}
		return require(resolvedPath) as T;
	} catch (error) {
		throw new Error(`Failed to load module from ${filePath}: ${error}`);
	}
}

export async function loadTransformModule(filePath: string, skipSecurityCheck = false): Promise<Transform> {
	type ModuleExports = {
		default?: Transform;
		transform?: Transform["transform"];
		name?: string;
	} & Transform;

	const fileName = path.basename(filePath);

	try {
		// Perform security analysis before loading
		if (!skipSecurityCheck) {
			const analysis = await TransformValidator.analyzeFile(filePath);
			
			if (!analysis.safe) {
				const errorMessage = [
					`Transform file ${fileName} failed security validation:`,
					...analysis.warnings,
					...(analysis.blockedPatterns.length > 0 ? [
						"Blocked patterns detected:",
						...analysis.blockedPatterns
					] : []),
					`Risk score: ${analysis.riskScore}/10`
				].join("\n  ");
				
				throw new Error(errorMessage);
			}

			if (analysis.warnings.length > 0) {
				console.warn(`Security warnings for ${fileName}:`);
				analysis.warnings.forEach(warning => console.warn(`  - ${warning}`));
				console.warn(`  Risk score: ${analysis.riskScore}/10`);
			}
		}

		const moduleExports = loadModule<ModuleExports>(filePath);
		const transform = moduleExports.default || moduleExports;

		if (typeof transform.transform !== "function") {
			throw new Error(
				"Transform file does not export a valid transform function",
			);
		}

		return transform;
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Transform file does not export")
		) {
			console.warn(
				`Transform file ${fileName} does not export a valid transform function`,
			);
			throw error;
		}
		if (
			error instanceof Error &&
			error.message.includes("security validation")
		) {
			console.error(`Security validation failed for ${fileName}:`);
			console.error(error.message);
			throw error;
		}
		console.error(`Error loading transform from ${fileName}:`, error);
		throw error;
	}
}
