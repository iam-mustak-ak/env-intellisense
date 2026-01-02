import * as vscode from "vscode";

let envVariables: Set<string> = new Set();

type EnvUsageLocation = {
    uri: vscode.Uri;
    range: vscode.Range;
};

type EnvUsageInfo = {
    count: number;
    files: Set<string>;
    locations: EnvUsageLocation[];
};

let envUsageInfo: Map<string, EnvUsageInfo> = new Map();

const ENV_ACCESS_PATTERNS = [
    // process.env.VAR
    (env: string) => new RegExp(`\\bprocess\\.env\\.${env}\\b`, "g"),

    // process.env['VAR'] or process.env["VAR"]
    (env: string) =>
        new RegExp(`\\bprocess\\.env\\[['"\`]${env}['"\`]\\]`, "g"),

    // import.meta.env.VAR (Vite)
    (env: string) => new RegExp(`\\bimport\\.meta\\.env\\.${env}\\b`, "g"),

    // env.VAR (generic)
    (env: string) => new RegExp(`\\benv\\.${env}\\b`, "g"),
];

let envDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
        color: "#888",
        margin: "0 0 0 1em",
    },
});

let scanTimeout: NodeJS.Timeout | undefined;

/**
 * Debounce trigger for scanning environment files and project usage.
 * Waits 500ms after the last call, then reloads env variables,
 * rescans usages across the workspace, and updates decorations for
 * the active editor if it's an env file.
 */
function debounceScan() {
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }

    scanTimeout = setTimeout(async () => {
        await loadEnvVariables();
        await scanEnvUsage();

        if (vscode.window.activeTextEditor) {
            decorateEnvFile(vscode.window.activeTextEditor);
        }
    }, 500);
}

/**
 * Extension activation entrypoint.
 * Registers completion provider, definition provider, filesystem watchers,
 * and sets up initial scanning of environment variables and usages.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log("Env Usage Helper activated");

    loadEnvVariables().then(() => {
        scanEnvUsage();

        // Apply if .env already open
        if (vscode.window.activeTextEditor) {
            decorateEnvFile(vscode.window.activeTextEditor);
        }
    });

    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            decorateEnvFile(editor);
        }
    });

    const provider = vscode.languages.registerCompletionItemProvider(
        ["javascript", "typescript", "javascriptreact", "typescriptreact"],
        {
            provideCompletionItems(document, position) {
                return provideEnvCompletions(document, position);
            },
        },
        "."
    );

    const disposable = vscode.commands.registerCommand(
        "env-intellisense.envIntellisense",
        () => {
            vscode.window.showInformationMessage(
                "Env Intellisense Activated!!!"
            );
        }
    );

    const codeWatcher = vscode.workspace.createFileSystemWatcher(
        "**/*.{js,ts,jsx,tsx}"
    );
    const envWatcher = vscode.workspace.createFileSystemWatcher("**/.env*");

    const definitionProvider = vscode.languages.registerDefinitionProvider(
        { pattern: "**/.env*" },
        {
            provideDefinition(document, position) {
                const line = document.lineAt(position.line).text;

                const match = line.match(/^([A-Z0-9_]+)=/);
                if (!match) {
                    return;
                }

                const envName = match[1];
                const usage = envUsageInfo.get(envName);

                if (!usage || usage.locations.length === 0) {
                    return;
                }

                // Return all locations → VS Code shows a picker
                return usage.locations.map((loc) => {
                    return new vscode.Location(loc.uri, loc.range);
                });
            },
        }
    );

    codeWatcher.onDidChange(debounceScan);
    codeWatcher.onDidCreate(debounceScan);
    codeWatcher.onDidDelete(debounceScan);

    envWatcher.onDidChange(debounceScan);
    envWatcher.onDidCreate(debounceScan);
    envWatcher.onDidDelete(debounceScan);

    context.subscriptions.push(provider);
    context.subscriptions.push(disposable);
    context.subscriptions.push(codeWatcher);
    context.subscriptions.push(envWatcher);
    context.subscriptions.push(definitionProvider);

    vscode.workspace.onDidChangeTextDocument((event) => {
        if (
            event.document.languageId.includes("javascript") ||
            event.document.languageId.includes("typescript") ||
            event.document.fileName.includes(".env")
        ) {
            debounceScan();
        }
    });
}

/**
 * Load environment variable names from all `.env*` files in the workspace.
 * Populates the `envVariables` set by reading each env file and parsing keys.
 */
async function loadEnvVariables() {
    envVariables.clear();

    const envFiles = await vscode.workspace.findFiles(
        "**/.env*",
        "**/node_modules/**"
    );

    for (const file of envFiles) {
        const content = await vscode.workspace.fs.readFile(file);
        const text = Buffer.from(content).toString("utf8");

        parseEnvFile(text);
    }

    console.log("ENV VARIABLES:", Array.from(envVariables));
}

/**
 * Scan workspace source files for usages of loaded environment variables.
 * Initializes `envUsageInfo` and records counts, files, and locations
 * where `process.env.VAR` occurrences are found.
 */
async function scanEnvUsage() {
    envUsageInfo.clear();

    for (const env of envVariables) {
        envUsageInfo.set(env, {
            count: 0,
            files: new Set<string>(),
            locations: [],
        });
    }

    const files = await vscode.workspace.findFiles(
        "**/*.{js,ts,jsx,tsx}",
        "**/{node_modules,dist,build,.next}/**"
    );

    for (const file of files) {
        const content = await vscode.workspace.fs.readFile(file);
        const text = Buffer.from(content).toString("utf8");

        countEnvInText(text, file.fsPath, file);
    }

    console.log(
        "ENV USAGE INFO:",
        Object.fromEntries(
            [...envUsageInfo.entries()].map(([k, v]) => [
                k,
                {
                    count: v.count,
                    files: [...v.files],
                    locations: v.locations.length,
                },
            ])
        )
    );
}

/**
 * Count occurrences of each environment variable in the provided text.
 * For every match of `process.env.<VAR>` this updates the corresponding
 * entry in `envUsageInfo` with a count, file reference, and location range.
 */
function countEnvInText(text: string, filePath: string, uri: vscode.Uri) {
    for (const env of envVariables) {
        for (const patternFactory of ENV_ACCESS_PATTERNS) {
            const regex = patternFactory(env);
            let match: RegExpExecArray | null;

            while ((match = regex.exec(text))) {
                const start = match.index;

                const startPos = text.substring(0, start).split("\n");
                const line = startPos.length - 1;
                const char = startPos[startPos.length - 1].length;

                const usage = envUsageInfo.get(env);
                if (!usage) {
                    continue;
                }

                usage.count++;
                usage.files.add(vscode.workspace.asRelativePath(filePath));
                usage.locations.push({
                    uri,
                    range: new vscode.Range(
                        new vscode.Position(line, char),
                        new vscode.Position(line, char + match[0].length)
                    ),
                });
            }
        }
    }
}

/**
 * Parse the contents of a single env file and add discovered keys
 * to the `envVariables` set. Ignores comments and empty lines.
 */
function parseEnvFile(content: string) {
    const lines = content.split("\n");

    for (const line of lines) {
        const trimmed = line.trim();

        // Ignore comments and empty lines
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        // Match KEY=VALUE
        const match = trimmed.match(/^([A-Z0-9_]+)=/);

        if (match) {
            envVariables.add(match[1]);
        }
    }
}

/**
 * Provide completion items for environment variables when typing
 * `process.env.` in supported JavaScript/TypeScript files.
 */
function provideEnvCompletions(
    document: vscode.TextDocument,
    position: vscode.Position
): vscode.CompletionItem[] | undefined {
    const linePrefix = document
        .lineAt(position)
        .text.substring(0, position.character);

    // trigger
    if (
        !(
            linePrefix.endsWith("process.env.") ||
            linePrefix.endsWith("import.meta.env.") ||
            linePrefix.endsWith("env.")
        )
    ) {
        return;
    }

    return Array.from(envVariables).map((env) => {
        const item = new vscode.CompletionItem(
            env,
            vscode.CompletionItemKind.Variable
        );

        item.insertText = env;
        item.detail = "ENV variable";

        return item;
    });
}

/**
 * Decorate an open `.env` file in the editor by appending usage
 * information (used/unused and file snippets) to each environment key line.
 */
function decorateEnvFile(editor: vscode.TextEditor) {
    const doc = editor.document;

    if (!doc.fileName.includes(".env")) {
        return;
    }

    const decorations: vscode.DecorationOptions[] = [];

    for (let i = 0; i < doc.lineCount; i++) {
        const fullLineText = doc.lineAt(i).text;
        const line = fullLineText.trim();

        if (!line || line.startsWith("#")) {
            continue;
        }

        const match = line.match(/^([A-Z0-9_]+)=/);
        if (!match) {
            continue;
        }

        const envName = match[1];
        const usage = envUsageInfo.get(envName);

        const count = usage?.count ?? 0;

        // show max 3 files to keep UI clean
        const files =
            usage && usage.files.size > 0
                ? [...usage.files].slice(0, 3).join(", ")
                : "";

        const extraFilesCount =
            usage && usage.files.size > 3 ? ` +${usage.files.size - 3}` : "";

        const suffix =
            count > 0
                ? `  # used: ${count} (${files}${extraFilesCount})`
                : `  # unused`;

        decorations.push({
            range: new vscode.Range(
                new vscode.Position(i, fullLineText.length),
                new vscode.Position(i, fullLineText.length)
            ),
            renderOptions: {
                after: {
                    contentText: suffix,
                    color: "#888",
                },
            },
        });
    }

    editor.setDecorations(envDecorationType, decorations);
}

/**
 * Extension deactivation.
 */
export function deactivate() {
    envDecorationType.dispose();
}
