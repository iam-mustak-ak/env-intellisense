import * as vscode from "vscode";
import { envVariables } from "./state";

/**
 * Provide completion items for environment variables when typing
 * `process.env.` in supported JavaScript/TypeScript files.
 */
export function provideEnvCompletions(
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
            linePrefix.endsWith("env.") ||
            linePrefix.endsWith('env("') ||
            linePrefix.endsWith("env('")
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
