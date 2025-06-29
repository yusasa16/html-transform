# html-transform

A CLI tool to transform HTML files using custom JavaScript/TypeScript functions.

## Features

- 🚀 **Direct TypeScript support** - No compilation required, runs `.ts` files directly
- 🎯 **Custom transformations** - Write your own transformation logic
- 🔧 **Template reference** - Compare against reference HTML files
- ✨ **Prettier integration** - Automatic code formatting
- 📦 **Future npm support** - Will support npx usage

## Installation

### Clone and build (current)

```bash
git clone <repository-url>
cd html-transform
npm install
npm run build
```

### Use the tool

```bash
node dist/cli.js -i input.html -t ./transforms/ -o output.html
```

### npm package (ready for publishing)

```bash
# Global installation (after publishing)
npm install -g @yusasa16/html-transform

# Direct usage without installation
npx @yusasa16/html-transform -i input.html -t ./transforms/ -o output.html
```

## Quick Start

1. **Create transform functions**:

```typescript
// transforms/01-update-title.ts
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

2. **Run transformation**:

```bash
node dist/cli.js -i input.html -t ./transforms/ -o output.html
```

## Usage

```bash
node dist/cli.js [options]

Options:
  -i, --input <path>          Input HTML file path
  -t, --transforms <dir>      Directory containing transform files
  -r, --reference <path>      Reference template HTML file (optional)
  -o, --output <path>         Output file path (default: stdout)
  -c, --config <path>         Configuration file path (optional)
  --dry-run                   Run without writing files
  --verbose                   Enable verbose logging
  --no-format                 Skip Prettier formatting
  --prettier-config <path>    Custom Prettier config file
  -h, --help                  Display help
  -V, --version               Display version
```

## Transform Files

Transform files are TypeScript/JavaScript modules that export transformation functions:

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
- `config`: Configuration object (if config file provided)
- `utils`: Utility functions for common DOM operations

## Transform Ordering

Transforms are executed in alphabetical order. Use numeric prefixes to control execution order:

```
transforms/
├── 01-update-meta.ts
├── 02-update-header.ts
├── 03-update-content.ts
└── 99-cleanup.ts
```

## Examples

### Update Page Title

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

### Add CSS Classes

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

### Replace Content from Template

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

## Configuration

You can provide a JSON configuration file that will be passed to transforms:

```json
{
    "siteName": "My Website",
    "theme": "dark",
    "features": {
        "analytics": true,
        "comments": false
    }
}
```

Use in transforms:

```typescript
export default {
    name: "apply-config",
    transform: ({ document, config }) => {
        if (config?.siteName) {
            const title = document.querySelector("title");
            if (title) {
                title.textContent = `${title.textContent} - ${config.siteName}`;
            }
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

## TypeScript Support

The tool has full TypeScript support with type definitions for:

- Transform functions
- Context objects
- Utility functions
- CLI options

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
