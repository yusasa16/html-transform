import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import type {
	CLIOptions,
	Transform,
	TransformContext,
	TransformUtils,
} from ".";

describe("Types", () => {
	describe("Transform interface", () => {
		it("should accept valid transform object", () => {
			const transform: Transform = {
				name: "test-transform",
				description: "A test transform",
				order: 1,
				transform: () => {
					// Transform logic here
				},
			};

			expect(transform.name).toBe("test-transform");
			expect(transform.description).toBe("A test transform");
			expect(transform.order).toBe(1);
			expect(typeof transform.transform).toBe("function");
		});

		it("should work with minimal transform object", () => {
			const transform: Transform = {
				name: "minimal-transform",
				transform: () => {
					// Minimal transform
				},
			};

			expect(transform.name).toBe("minimal-transform");
			expect(transform.description).toBeUndefined();
			expect(transform.order).toBeUndefined();
		});
	});

	describe("TransformContext interface", () => {
		it("should include all required properties", () => {
			const dom = new JSDOM("<!DOCTYPE html><html></html>");
			const utils: TransformUtils = {
				copyAttributes: () => {},
				moveChildren: () => {},
				replaceElement: () => {},
			};

			const context: TransformContext = {
				dom,
				document: dom.window.document,
				utils,
			};

			expect(context.dom).toBe(dom);
			expect(context.document).toBe(dom.window.document);
			expect(context.utils).toBe(utils);
		});

		it("should allow optional template properties", () => {
			const dom = new JSDOM("<!DOCTYPE html><html></html>");
			const templateDom = new JSDOM("<!DOCTYPE html><html></html>");
			const utils: TransformUtils = {
				copyAttributes: () => {},
				moveChildren: () => {},
				replaceElement: () => {},
			};

			const context: TransformContext = {
				dom,
				document: dom.window.document,
				templateDom,
				templateDocument: templateDom.window.document,
				config: { setting: "value" },
				utils,
			};

			expect(context.templateDom).toBe(templateDom);
			expect(context.templateDocument).toBe(templateDom.window.document);
			expect(context.config).toEqual({ setting: "value" });
		});
	});

	describe("CLIOptions interface", () => {
		it("should accept valid CLI options", () => {
			const options: CLIOptions = {
				input: "input.html",
				transforms: "transforms/",
				reference: "template.html",
				output: "output.html",
				config: "config.json",
				dryRun: true,
				verbose: true,
				noFormat: false,
				prettierConfig: ".prettierrc",
			};

			expect(options.input).toBe("input.html");
			expect(options.transforms).toBe("transforms/");
			expect(options.reference).toBe("template.html");
			expect(options.output).toBe("output.html");
			expect(options.config).toBe("config.json");
			expect(options.dryRun).toBe(true);
			expect(options.verbose).toBe(true);
			expect(options.noFormat).toBe(false);
			expect(options.prettierConfig).toBe(".prettierrc");
		});

		it("should work with minimal required options", () => {
			const options: CLIOptions = {
				input: "input.html",
				transforms: "transforms/",
			};

			expect(options.input).toBe("input.html");
			expect(options.transforms).toBe("transforms/");
			expect(options.reference).toBeUndefined();
			expect(options.output).toBeUndefined();
		});
	});

	describe("TransformUtils interface", () => {
		it("should define all required utility functions", () => {
			const utils: TransformUtils = {
				copyAttributes: (_from: Element, _to: Element) => {},
				moveChildren: (_from: Element, _to: Element) => {},
				replaceElement: (_oldElement: Element, _newElement: Element) => {},
			};

			expect(typeof utils.copyAttributes).toBe("function");
			expect(typeof utils.moveChildren).toBe("function");
			expect(typeof utils.replaceElement).toBe("function");
		});
	});
});
