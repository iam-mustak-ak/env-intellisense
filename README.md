# env-intellisense

**env-intellisense** is a Visual Studio Code extension that provides **IntelliSense, usage tracking, and navigation for environment variables** defined in `.env` files.

It helps developers understand **where environment variables are used**, **how often they are used**, and **navigate quickly** to their usage across JavaScript and TypeScript projects.

---

## ✨ Key Features

-   IntelliSense for environment variables from `.env` files
-   Supports multiple access patterns:
    `process.env`, `import.meta.env`, `env.`
-   Counts environment variable usage across the workspace
-   Displays usage count and file paths inline in `.env` files
-   Ctrl / Cmd + Click to jump directly to variable usage
-   Live updates with debounced scanning
-   Non-intrusive: does not modify `.env` files

---

## Features

### Environment Variable IntelliSense

-   Automatically suggests environment variables defined in `.env`, `.env.local`, `.env.production`, and similar files
-   IntelliSense triggers while typing:
    ```ts
    process.env.
    import.meta.env.
    env.
    ```

---

### Multi-Syntax Environment Variable Detection

The extension detects environment variables accessed using common patterns across different ecosystems:

```ts
process.env.DB_HOST;

import.meta.env.VITE_API_URL;

env.DB_HOST;

env("DB_HOST");
```

---

### Workspace-wide Usage Counting with File Paths

-   Counts how many times each environment variable is used
-   Tracks which files contain usages
-   Example display inside `.env` files:

```env
DB_HOST=localhost     # used: 3 (src/db.ts, src/api.ts)
JWT_SECRET=secret    # used: 1 (auth.ts)
UNUSED_KEY=value     # unused
```

---

### Inline Usage Information in `.env` Files

-   Displays usage count and file paths beside each variable
-   Uses VS Code decorations (non-invasive)
-   Does not modify file contents
-   Safe for version control systems

---

### Ctrl / Cmd + Click Navigation

-   Navigate directly from `.env` variables to their usage in code
-   Shortcuts:
    -   **Ctrl + Click** (Windows / Linux)
    -   **Cmd + Click** (macOS)
-   If multiple usages exist, VS Code shows a location picker

---

### Live Updates

-   Automatically rescans when:
    -   JavaScript / TypeScript files change
    -   `.env` files change
-   Uses debounced scanning to maintain performance in large projects

---

## Supported Languages

-   JavaScript
-   TypeScript
-   JavaScript React (JSX)
-   TypeScript React (TSX)

---

## Requirements

-   Visual Studio Code **1.80.0 or later**
-   Project using `.env` files
-   JavaScript or TypeScript codebase

No additional configuration is required.

---

## Extension Settings

This extension does not currently contribute any user-configurable settings.
All features work automatically after installation.

---

## Known Issues

-   Initial scan may take a short time in very large projects
-   Currently focuses on JavaScript/TypeScript environments

---

## Release Notes

### 1.0.0

-   Initial release
-   Environment variable IntelliSense
-   Workspace-wide usage counting
-   Inline `.env` usage display
-   Ctrl / Cmd + Click navigation to usage locations
-   Live updates with debounced scanning

---

## Following Extension Guidelines

This extension follows Visual Studio Code extension best practices:

-   No file content modification
-   Native VS Code APIs only
-   Proper resource disposal on deactivation

For more information:
https://code.visualstudio.com/api/references/extension-guidelines

---

## Enjoy!

If you find **env-intellisense** useful:

-   ⭐ Rate it on the Marketplace
-   🐞 Report issues
-   💡 Suggest improvements

Happy coding! 🚀
