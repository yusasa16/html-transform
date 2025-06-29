import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import type { CLIOptions, Transform } from "../types";
import { applyTransforms, formatHTML, transformUtils } from "./transformer";

describe("transformer", () => {
	describe("transformUtils", () => {
		let dom: JSDOM;
		let document: Document;

		beforeEach(() => {
			dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
			document = dom.window.document;
		});

		describe("copyAttributes", () => {
			it("should copy all attributes from source to target element", () => {
				const source = document.createElement("div");
				const target = document.createElement("span");

				source.setAttribute("id", "test-id");
				source.setAttribute("class", "test-class");
				source.setAttribute("data-value", "123");

				transformUtils.copyAttributes(source, target);

				expect(target.getAttribute("id")).toBe("test-id");
				expect(target.getAttribute("class")).toBe("test-class");
				expect(target.getAttribute("data-value")).toBe("123");
			});
		});

		describe("moveChildren", () => {
			it("should move all children from source to target element", () => {
				const source = document.createElement("div");
				const target = document.createElement("span");

				const child1 = document.createElement("p");
				child1.textContent = "Child 1";
				const child2 = document.createElement("p");
				child2.textContent = "Child 2";

				source.appendChild(child1);
				source.appendChild(child2);

				transformUtils.moveChildren(source, target);

				expect(source.children.length).toBe(0);
				expect(target.children.length).toBe(2);
				expect(target.children[0].textContent).toBe("Child 1");
				expect(target.children[1].textContent).toBe("Child 2");
			});
		});

		describe("replaceElement", () => {
			it("should replace old element with new element", () => {
				const container = document.createElement("div");
				const oldElement = document.createElement("span");
				const newElement = document.createElement("p");

				oldElement.textContent = "Old";
				newElement.textContent = "New";
				container.appendChild(oldElement);

				transformUtils.replaceElement(oldElement, newElement);

				expect(container.children.length).toBe(1);
				expect(container.children[0].tagName).toBe("P");
				expect(container.children[0].textContent).toBe("New");
			});
		});
	});

	describe("applyTransforms", () => {
		it("should apply all transforms in order", async () => {
			const dom = new JSDOM(
				"<!DOCTYPE html><html><head><title>Original</title></head><body></body></html>",
			);
			const transforms: Transform[] = [
				{
					name: "transform1",
					transform: ({ document }) => {
						const title = document.querySelector("title");
						if (title) title.textContent = "Step1";
					},
				},
				{
					name: "transform2",
					transform: ({ document }) => {
						const title = document.querySelector("title");
						if (title) title.textContent += " Step2";
					},
				},
			];

			await applyTransforms(dom, transforms, {});

			expect(dom.window.document.title).toBe("Step1 Step2");
		});

		it("should provide utils in context", async () => {
			const dom = new JSDOM(
				"<!DOCTYPE html><html><body><div id='test'></div></body></html>",
			);
			const transforms: Transform[] = [
				{
					name: "test-utils",
					transform: ({ utils }) => {
						expect(utils).toBeDefined();
						expect(typeof utils.copyAttributes).toBe("function");
						expect(typeof utils.moveChildren).toBe("function");
						expect(typeof utils.replaceElement).toBe("function");
					},
				},
			];

			await applyTransforms(dom, transforms, {});
		});
	});

	describe("formatHTML", () => {
		it("should format HTML with prettier when format is enabled", async () => {
			const html =
				"<html><head><title>Test</title></head><body><p>Hello</p></body></html>";
			const options: CLIOptions = {
				input: "test.html",
				transforms: "transforms/",
				noFormat: false,
			};

			const result = await formatHTML(html, options);

			// Should be formatted (different from input)
			expect(result).not.toBe(html);
			expect(result).toContain("Test");
			expect(result).toContain("Hello");
		});

		it("should skip formatting when noFormat is true", async () => {
			const html =
				"<html><head><title>Test</title></head><body><p>Hello</p></body></html>";
			const options: CLIOptions = {
				input: "test.html",
				transforms: "transforms/",
				noFormat: true,
			};

			const result = await formatHTML(html, options);

			expect(result).toBe(html);
		});
	});
});
