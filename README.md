# html-transform

A CLI tool to transform HTML files using custom JavaScript/TypeScript functions with config-driven architecture.

## ⚠️ CRITICAL SECURITY WARNING

**This tool executes arbitrary TypeScript/JavaScript code and has known security vulnerabilities:**

- 🚨 **Arbitrary Code Execution**: Transform files can execute any Node.js code
- 🚨 **Path Traversal**: File paths are not properly validated  
- 🚨 **Dependency Vulnerabilities**: Contains vulnerable dependencies

**DO NOT USE with untrusted transforms or in production environments without proper security measures.**

See [SECURITY.md](./SECURITY.md) for detailed security information.

## Features

- 🚀 **Direct TypeScript support** - No compilation required, runs `.ts` files directly
- 📋 **Config-driven architecture** - Centralized configuration with YAML/JSON support
- 🎯 **Custom transformations** - Write your own transformation logic
- 🔄 **Batch processing** - Transform multiple HTML files with glob patterns
- 📁 **Directory structure preservation** - Maintains nested folder hierarchies
- 🔧 **Template reference** - Compare against reference HTML files
- ✨ **Prettier integration** - Automatic code formatting
- 📦 **npm package ready** - Ready for npx usage

## Installation

### Clone and build (current)

```bash
git clone <repository-url>
cd html-transform
npm install
npm run build
```

### npm package (ready for publishing)

```bash
# Global installation (after publishing)
npm install -g @yusasa16/html-transform

# Direct usage without installation
npx @yusasa16/html-transform -t ./transforms/
```

## Quick Start

1. **Create transforms directory with config**:

```yaml
# transforms/config.yaml
transforms:
  - "update-title.ts"
  - "update-header.ts"
  - "add-classes.ts"

# Required settings
input: "../input/**/*.html"
output: "../output"

# Optional settings
reference: null
dryRun: false
verbose: true
noFormat: false
prettierConfig: null
```

2. **Create transform functions**:

```typescript
// transforms/update-title.ts
import { Transform } from "@yusasa16/html-transform";

export default {
    name: "update-title",
    description: "Update page title",
    transform: ({ document }) => {
        const title = document.querySelector("title");
        if (title) {
            title.textContent = "New Title";
        }
    },
} as Transform;
```

3. **Set up directory structure**:

```
project/
├── input/
│   ├── index.html
│   ├── about.html
│   └── blog/
│       └── post.html
├── transforms/
│   ├── config.yaml
│   ├── update-title.ts
│   └── update-header.ts
└── output/         # Auto-generated
```

4. **Run transformation**:

```bash
# Using config file only
html-transform -t transforms/

# Override config with CLI options
html-transform -t transforms/ -i "custom/*.html" -o custom-output/
```

## Usage

```bash
html-transform [options]

Options:
  -i, --input <pattern>       Input HTML file pattern (glob) - overrides config
  -t, --transforms <dir>      Directory containing transform files and config
  -r, --reference <path>      Reference template HTML file - overrides config
  -o, --output <dir>          Output directory path - overrides config
  -c, --config <path>         Custom config file path (default: auto-detect)
  --dry-run                   Run without writing files - overrides config
  --verbose                   Enable verbose logging - overrides config
  --no-format                 Skip Prettier formatting - overrides config
  --prettier-config <path>    Custom Prettier config file - overrides config
  -h, --help                  Display help
  -V, --version               Display version
```

## Configuration

### Config File (Required)

Every transforms directory must contain a `config.yaml`, `config.yml`, or `config.json` file:

#### YAML Format (recommended)

```yaml
# Transform execution order
transforms:
  - "update-title.ts"
  - "update-header.ts" 
  - "add-classes.ts"

# Required settings
input: "../input/**/*.html"    # Glob pattern (relative to transforms dir)
output: "../output"            # Output directory (relative to transforms dir)

# Optional settings
reference: "../template.html"  # Reference template file
dryRun: false                  # Preview mode
verbose: true                  # Detailed logging
noFormat: false                # Skip Prettier formatting
prettierConfig: null           # Custom Prettier config
```

#### JSON Format

```json
{
  "transforms": [
    "update-title.ts",
    "update-header.ts",
    "add-classes.ts"
  ],
  "input": "../input/**/*.html",
  "output": "../output",
  "reference": null,
  "dryRun": false,
  "verbose": true,
  "noFormat": false,
  "prettierConfig": null
}
```

### CLI Option Priority

CLI options always override config file settings:

1. **CLI options** (highest priority)
2. **Config file settings**
3. **Default values** (lowest priority)

### Path Resolution

- **Relative paths** in config files are resolved relative to the transforms directory
- **Absolute paths** are used as-is
- **CLI paths** are resolved relative to current working directory

## Transform Files

Transform files are TypeScript/JavaScript modules that export transformation functions.

### File Naming

Transform files are executed in the order specified in the config file, **not** by filename:

```yaml
# This controls execution order, not filename prefixes
transforms:
  - "header-updates.ts"      # Executes first
  - "content-changes.ts"     # Executes second  
  - "footer-cleanup.ts"      # Executes third
```

### Basic Transform

```typescript
import { Transform } from "@yusasa16/html-transform";

export default {
    name: "my-transform",
    description: "Description of what this does",
    transform: ({ document, utils }) => {
        // Your transformation logic here
        const element = document.querySelector(".my-class");
        if (element) {
            element.textContent = "Updated content";
        }
    },
} as Transform;
```

### Using Template Reference

```typescript
export default {
    name: "copy-from-template",
    transform: ({ document, templateDocument }) => {
        const oldHeader = document.querySelector("header");
        const newHeader = templateDocument?.querySelector("header");

        if (oldHeader && newHeader && oldHeader.parentNode) {
            oldHeader.parentNode.replaceChild(
                newHeader.cloneNode(true),
                oldHeader,
            );
        }
    },
} as Transform;
```

### Transform Context

Each transform receives a context object with:

- `dom`: JSDOM instance
- `document`: Document object for manipulation
- `templateDom`: JSDOM instance of reference template (if provided)
- `templateDocument`: Document object of template (if provided)
- `config`: Configuration object (legacy - use config file instead)
- `utils`: Utility functions for common DOM operations

### Utility Functions

The `utils` object provides helpful DOM manipulation functions:

```typescript
export default {
    name: "use-utilities",
    transform: ({ document, utils }) => {
        const oldElement = document.querySelector(".old");
        const newElement = document.createElement("div");
        
        // Copy all attributes
        utils.copyAttributes(oldElement, newElement);
        
        // Move all children
        utils.moveChildren(oldElement, newElement);
        
        // Replace element in DOM
        utils.replaceElement(oldElement, newElement);
    },
} as Transform;
```

## Examples

### Directory Structure Preservation

Input structure:
```
input/
├── index.html
├── about.html
└── blog/
    ├── post1.html
    └── 2023/
        └── post2.html
```

Output structure (preserved):
```
output/
├── index.html
├── about.html
└── blog/
    ├── post1.html
    └── 2023/
        └── post2.html
```

### Multi-file Glob Patterns

```yaml
# Process all HTML files recursively
input: "../src/**/*.html"

# Process specific patterns
input: "../pages/*.html"

# Process multiple extensions (requires multiple runs)
input: "../content/**/*.{html,htm}"
```

### Common Transform Examples

#### Update Page Title

```typescript
export default {
    name: "update-title",
    transform: ({ document }) => {
        const title = document.querySelector("title");
        if (title) {
            title.textContent = "My New Title";
        }
    },
} as Transform;
```

#### Add CSS Classes

```typescript
export default {
    name: "add-classes",
    transform: ({ document }) => {
        document.querySelectorAll(".old-class").forEach((el) => {
            el.classList.add("new-class", "enhanced");
        });
    },
} as Transform;
```

#### Update Navigation from Template

```typescript
export default {
    name: "update-navigation",
    transform: ({ document, templateDocument }) => {
        const nav = document.querySelector("nav");
        const templateNav = templateDocument?.querySelector("nav");

        if (nav && templateNav && nav.parentNode) {
            // Preserve any custom attributes
            const id = nav.id;
            nav.parentNode.replaceChild(templateNav.cloneNode(true), nav);
            if (id) {
                document.querySelector("nav")!.id = id;
            }
        }
    },
} as Transform;
```

#### Conditional Transformations

```typescript
export default {
    name: "conditional-update",
    transform: ({ document }) => {
        // Only process blog pages
        if (document.querySelector(".blog-post")) {
            const meta = document.createElement("meta");
            meta.setAttribute("name", "article");
            meta.setAttribute("content", "true");
            document.head.appendChild(meta);
        }
    },
} as Transform;
```

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing with Local Files

```bash
# Use development version
npm start -- -t test/transforms/ --verbose

# Test without writing files
npm start -- -t test/transforms/ --dry-run

# Override input pattern
npm start -- -t test/transforms/ -i "test/input/*.html"
```

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format:fix

# Check everything (lint + format)
npm run check:fix

# CI pipeline
npm run ci
```

## Error Handling

### Common Errors

- **Missing config file**: Ensure `config.yaml`, `config.yml`, or `config.json` exists in transforms directory
- **Missing input/output**: Both input pattern and output directory are required (CLI or config)
- **No files found**: Check that glob pattern matches existing files
- **Transform errors**: Check transform syntax and logic

### Debugging

```bash
# Enable verbose logging
html-transform -t transforms/ --verbose

# Dry run to preview changes
html-transform -t transforms/ --dry-run

# Check files being processed
html-transform -t transforms/ --verbose | grep "Output written"
```

## TypeScript Support

The tool has full TypeScript support with type definitions for:

- Transform functions and context
- Configuration objects
- CLI options and resolved options
- Utility functions

## Migration from Legacy Version

If upgrading from the old numeric-prefix system:

1. **Create config file** in transforms directory
2. **List transforms** in desired execution order
3. **Remove numeric prefixes** from filenames (optional)
4. **Add input/output** settings to config
5. **Update CLI usage** to use new options

Example migration:

```bash
# Old usage
html-transform -i input.html -o output.html -t transforms/

# New usage  
html-transform -t transforms/
```

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request