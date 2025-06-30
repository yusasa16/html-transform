import * as fs from "node:fs";
import * as path from "node:path";
import { JSDOM } from "jsdom";
import type {
	CLIOptions,
	Transform,
	TransformContext,
	TransformUtils,
	ResolvedOptions,
} from "../types";

export const transformUtils: TransformUtils = {
	copyAttributes(from: Element, to: Element) {
		Array.from(from.attributes).forEach((attr) => {
			to.setAttribute(attr.name, attr.value);
		});
	},

	moveChildren(from: Element, to: Element) {
		while (from.firstChild) {
			to.appendChild(from.firstChild);
		}
	},

	replaceElement(oldElement: Element, newElement: Element) {
		if (oldElement.parentNode) {
			oldElement.parentNode.replaceChild(
				newElement.cloneNode(true),
				oldElement,
			);
		}
	},
};

export function loadHTML(filePath: string): JSDOM {
	if (!fs.existsSync(filePath)) {
		throw new Error(`HTML file not found: ${filePath}`);
	}

	const htmlContent = fs.readFileSync(filePath, "utf-8");
	return new JSDOM(htmlContent);
}

export async function loadTransforms(
	transformsDir: string,
	transformOrder?: string[],
): Promise<Transform[]> {
	if (!fs.existsSync(transformsDir)) {
		throw new Error(`Transforms directory not found: ${transformsDir}`);
	}

	const allFiles = fs
		.readdirSync(transformsDir)
		.filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

	let files: string[];
	if (transformOrder && transformOrder.length > 0) {
		// Use config-specified order
		files = transformOrder.filter(file => allFiles.includes(file));
		// Add any remaining files not in config
		const remainingFiles = allFiles.filter(file => !transformOrder.includes(file));
		files.push(...remainingFiles.sort());
	} else {
		// Fallback to numeric prefix sorting
		files = allFiles.sort((a, b) => {
			const aNum = Number.parseInt(a.match(/^\d+/)?.[0] || "999");
			const bNum = Number.parseInt(b.match(/^\d+/)?.[0] || "999");
			return aNum - bNum;
		});
	}

	const transforms: Transform[] = [];

	for (const file of files) {
		const filePath = path.resolve(transformsDir, file);
		try {
			type ModuleExports = {
				default?: Transform;
				transform?: Transform["transform"];
				name?: string;
			} & Transform;

			let moduleExports: ModuleExports;

			if (file.endsWith(".ts")) {
				// Use jiti to load TypeScript files directly
				const { createJiti } = require("jiti");
				const jiti = createJiti(__filename, {
					interopDefault: true,
					transformOptions: {
						typescript: true,
					},
				});
				moduleExports = jiti(filePath) as ModuleExports;
			} else {
				// Regular require for JavaScript files
				moduleExports = require(filePath) as ModuleExports;
			}

			const transform = moduleExports.default || moduleExports;

			if (typeof transform.transform === "function") {
				transforms.push(transform);
			} else {
				console.warn(
					`Transform file ${file} does not export a valid transform function`,
				);
			}
		} catch (error) {
			console.error(`Error loading transform from ${file}:`, error);
		}
	}

	return transforms;
}

export async function applyTransforms(
	dom: JSDOM,
	transforms: Transform[],
	context: Partial<TransformContext>,
): Promise<void> {
	const fullContext: TransformContext = {
		dom,
		document: dom.window.document,
		utils: transformUtils,
		...context,
	};

	for (const transform of transforms) {
		try {
			await transform.transform(fullContext);
		} catch (error) {
			console.error(`Error applying transform "${transform.name}":`, error);
			throw error;
		}
	}
}

export async function formatHTML(
	html: string,
	options: { noFormat?: boolean; prettierConfig?: string },
): Promise<string> {
	if (options.noFormat) {
		return html;
	}

	try {
		const prettier = require("prettier");

		let config = {};
		if (options.prettierConfig) {
			const configPath = path.resolve(options.prettierConfig);
			if (fs.existsSync(configPath)) {
				config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
			}
		}

		return prettier.format(html, {
			parser: "html",
			...config,
		});
	} catch (error) {
		console.warn(
			"Prettier formatting failed, returning unformatted HTML:",
			error,
		);
		return html;
	}
}

export async function transform(options: ResolvedOptions & { input: string }): Promise<string> {
	const inputDom = loadHTML(options.input);

	let templateDom: JSDOM | undefined;
	let templateDocument: Document | undefined;

	if (options.reference) {
		templateDom = loadHTML(options.reference);
		templateDocument = templateDom.window.document;
	}

	const transforms = await loadTransforms(options.transforms, options.transformOrder);

	if (options.verbose) {
		console.log(
			`Loaded ${transforms.length} transforms:`,
			transforms.map((t) => t.name),
		);
	}

	await applyTransforms(inputDom, transforms, {
		templateDom,
		templateDocument,
		config: {},
	});

	const resultHTML = inputDom.serialize();

	if (options.dryRun) {
		console.log("Dry run mode - no files will be written");
		return resultHTML;
	}

	return await formatHTML(resultHTML, {
		noFormat: options.noFormat,
		prettierConfig: options.prettierConfig
	});
}
