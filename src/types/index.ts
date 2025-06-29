import type { JSDOM } from "jsdom";

export interface TransformContext {
	dom: JSDOM;
	document: Document;
	templateDom?: JSDOM;
	templateDocument?: Document;
	config?: Record<string, unknown>;
	utils: TransformUtils;
}

export interface Transform {
	name: string;
	description?: string;
	order?: number;
	transform: (context: TransformContext) => void | Promise<void>;
}

export interface TransformUtils {
	copyAttributes: (from: Element, to: Element) => void;
	moveChildren: (from: Element, to: Element) => void;
	replaceElement: (oldElement: Element, newElement: Element) => void;
}

export interface CLIOptions {
	input: string;
	transforms: string;
	reference?: string;
	output?: string;
	config?: string;
	dryRun?: boolean;
	verbose?: boolean;
	noFormat?: boolean;
	prettierConfig?: string;
}

export interface FormatOptions {
	prettierConfig?: string;
	parser?: string;
}
