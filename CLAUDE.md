# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an npx CLI tool that performs extensive HTML DOM transformations using jsdom. It applies TypeScript transformation functions to existing HTML files while referencing template HTML files.

## Development Commands

- **Build**: `npm run build` - Compile TypeScript to JavaScript
- **Development**: `npm run dev` - Watch mode compilation
- **Start application**: `npm start` - Uses jiti to run TypeScript source directly
- **Testing**: `npm test` - Run Vitest tests
- **Linting and formatting**: Uses Biome for code quality
  - Format code: `npm run format:fix`
  - Lint code: `npm run lint` or `npm run lint:fix`
  - Check both: `npm run check` or `npm run check:fix`
  - CI pipeline: `npm run ci`

## Architecture

The tool follows a modular architecture with clear separation of concerns:

### Core Components
- **CLI Interface** (`src/cli.ts`): Command-line argument parsing using commander
- **Transform Engine** (`src/core/transformer.ts`): Main transformation logic with integrated loading, formatting, and utility functions
- **Type Definitions** (`src/types/index.ts`): TypeScript interfaces and types

### Key Types
- `TransformContext`: Context object passed to transform functions containing DOM, template, and utilities
- `Transform`: Interface for transformation functions with name, description, and transform method
- `CLIOptions`: Configuration options for the CLI

### Transform System
- Transform functions are TypeScript files with default exports
- Named with numeric prefixes for execution order (e.g., `01-update-header.ts`)
- Loaded dynamically from specified directory
- Receive TransformContext with DOM access and utility functions

### Dependencies
- `jsdom`: HTML parsing and DOM manipulation
- `commander`: CLI framework
- `prettier`: Code formatting
- `glob`: File pattern matching
- `jiti`: TypeScript runtime execution
- `vitest`: Testing framework
- `@biomejs/biome`: Linting and formatting

## Implementation Phases

1. **Phase 1**: Basic CLI and transform execution
2. **Phase 2**: Template HTML reference support
3. **Phase 3**: Prettier formatting and dry-run mode
4. **Phase 4**: Advanced features (glob patterns, config files)

## Code Style

- Uses Biome with tab indentation and double quotes
- TypeScript with strict type checking
- Clear error handling with descriptive messages
- Modular design with single responsibility principle