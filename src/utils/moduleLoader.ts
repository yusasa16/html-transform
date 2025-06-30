import path from "node:path";
import type { Transform } from "../types/index.js";

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

export function loadTransformModule(filePath: string): Transform {
	type ModuleExports = {
		default?: Transform;
		transform?: Transform["transform"];
		name?: string;
	} & Transform;

	try {
		const moduleExports = loadModule<ModuleExports>(filePath);
		const transform = moduleExports.default || moduleExports;

		if (typeof transform.transform !== "function") {
			throw new Error(
				"Transform file does not export a valid transform function",
			);
		}

		return transform;
	} catch (error) {
		const fileName = path.basename(filePath);
		if (
			error instanceof Error &&
			error.message.includes("Transform file does not export")
		) {
			console.warn(
				`Transform file ${fileName} does not export a valid transform function`,
			);
			throw error;
		}
		console.error(`Error loading transform from ${fileName}:`, error);
		throw error;
	}
}
