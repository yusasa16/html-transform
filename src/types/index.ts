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
	output: string;
	config?: string;
	dryRun?: boolean;
	verbose?: boolean;
	noFormat?: boolean;
	prettierConfig?: string;
	skipSecurityCheck?: boolean;
	securityOnly?: boolean;
}

export interface TransformConfig {
	transforms: string[];
	reference?: string;
	dryRun?: boolean;
	noFormat?: boolean;
	prettierConfig?: string;
	verbose?: boolean;
}

export interface ResolvedOptions {
	input: string[];
	transforms: string;
	transformOrder: string[];
	reference?: string;
	outputDir?: string;
	dryRun: boolean;
	verbose: boolean;
	noFormat: boolean;
	prettierConfig?: string;
	inputPattern?: string;
	config: Partial<TransformConfig>;
	skipSecurityCheck?: boolean;
	securityOnly?: boolean;
}

export interface FormatOptions {
	prettierConfig?: string;
	parser?: string;
}
