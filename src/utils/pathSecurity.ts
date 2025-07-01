import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Security patterns and configuration
 */
const BLOCKED_PATTERNS = [
	/\.\./,  // Path traversal
	/^\/etc\//,  // System directories
	/^\/usr\//,
	/^\/bin\//,
	/^\/sbin\//,
	/^\/root\//,
	/^\/proc\//,
	/^\/sys\//,
	/^\/dev\//,
	/^\/var\/log\//,
	/^\/home\/[^/]+\/\./,  // Hidden files in user directories
	/\.ssh/i,  // SSH keys
	/\.aws/i,  // AWS credentials
	/\.env/i,  // Environment files
	/\.key$/i,  // Private keys
	/\.pem$/i,  // Certificate files
	/\.p12$/i,  // PKCS#12 files
	/\.pfx$/i,  // PFX files
	/id_rsa/i,  // SSH private keys
	/id_dsa/i,  // DSA private keys
	/id_ecdsa/i,  // ECDSA private keys
	/authorized_keys/i,  // SSH authorized keys
	/known_hosts/i,  // SSH known hosts
] as const;

const ALLOWED_EXTENSIONS = [
	'.html', '.htm', '.ts', '.js', '.json', '.yaml', '.yml', '.md'
] as const;

/**
 * Check if path contains blocked patterns
 */
export function isPathBlocked(inputPath: string): boolean {
	const normalized = path.normalize(inputPath);
	return BLOCKED_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Validates and secures a file path
 */
export function validatePath(inputPath: string, basePath?: string): string {
	if (!inputPath || typeof inputPath !== 'string') {
		throw new Error('Invalid path: path must be a non-empty string');
	}

	// Normalize path to prevent bypass attempts
	const normalized = path.normalize(inputPath);
	
	// Check for blocked patterns
	if (isPathBlocked(normalized)) {
		console.warn('Security: Blocked path access attempt');
		throw new Error('Access denied: path violates security policy');
	}

	// Apply base path restriction if provided
	if (basePath) {
		const resolvedBase = path.resolve(basePath);
		const resolved = path.resolve(resolvedBase, normalized);
		const relativeToBased = path.relative(resolvedBase, resolved);
		
		// Ensure path stays within base directory
		if (relativeToBased.startsWith('..') || path.isAbsolute(relativeToBased)) {
			console.warn('Security: Path traversal attempt blocked');
			throw new Error('Access denied: path outside allowed directory');
		}
		return resolved;
	}

	return path.resolve(normalized);
}

/**
 * Check if file extension is allowed
 */
export function isExtensionAllowed(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number]);
}

/**
 * Validates file extension against allowlist
 */
export function validateExtension(filePath: string): void {
	if (!filePath || typeof filePath !== 'string') {
		throw new Error('Invalid file path for extension validation');
	}

	const ext = path.extname(filePath).toLowerCase();
	if (!ext) {
		throw new Error('File must have an extension');
	}

	if (!isExtensionAllowed(filePath)) {
		console.warn(`Security: Blocked file extension: ${ext}`);
		throw new Error(`File extension not allowed: ${ext}`);
	}
}

/**
 * Validates directory existence and permissions
 */
export function validateDirectory(dirPath: string): string {
	if (!dirPath || typeof dirPath !== 'string') {
		throw new Error('Invalid directory path');
	}

	const resolved = validatePath(dirPath);

	if (!fs.existsSync(resolved)) {
		throw new Error('Requested directory does not exist');
	}

	const stats = fs.statSync(resolved);
	if (!stats.isDirectory()) {
		throw new Error('Requested path is not a directory');
	}

	return resolved;
}

/**
 * Validates file existence and readability
 */
export function validateFile(filePath: string, basePath?: string): string {
	const validated = validatePath(filePath, basePath);
	validateExtension(validated);

	if (!fs.existsSync(validated)) {
		throw new Error('Requested file does not exist');
	}

	const stats = fs.statSync(validated);
	if (!stats.isFile()) {
		throw new Error('Requested path is not a file');
	}

	// Check file permissions
	try {
		fs.accessSync(validated, fs.constants.R_OK);
	} catch {
		throw new Error('Requested file is not accessible');
	}

	return validated;
}

/**
 * Safely resolves glob patterns within a base directory
 */
export function validateGlobPattern(pattern: string, basePath: string): string {
	if (!pattern || typeof pattern !== 'string') {
		throw new Error('Invalid glob pattern');
	}

	// Ensure pattern doesn't contain path traversal
	if (pattern.includes('..')) {
		throw new Error('Glob pattern cannot contain path traversal sequences');
	}

	// Ensure pattern is relative to base path
	const resolved = path.resolve(basePath, pattern);
	const relative = path.relative(basePath, resolved);
	
	if (relative.startsWith('..')) {
		throw new Error('Glob pattern must be within base directory');
	}

	return pattern;
}

/**
 * Gets list of allowed file extensions
 */
export function getAllowedExtensions(): readonly string[] {
	return ALLOWED_EXTENSIONS;
}

/**
 * Gets list of blocked patterns (for testing/debugging)
 */
export function getBlockedPatterns(): readonly RegExp[] {
	return BLOCKED_PATTERNS;
}