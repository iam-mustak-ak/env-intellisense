import * as vscode from "vscode";
import { provideEnvCompletions } from "./completions";
import { decorateEnvFile, envDecorationType } from "./decorations";
import { envDefinitionProvider } from "./definitions";
import { loadEnvVariables, scanEnvUsage } from "./scanner";

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
        ".",
        '"',
        "'"
    );

    const disposable = vscode.commands.registerCommand(
        "env-intellisense-prime.envIntellisense",
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
        envDefinitionProvider
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
 * Extension deactivation.
 */
export function deactivate() {
    envDecorationType.dispose();
}
