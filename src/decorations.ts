import * as vscode from "vscode";
import { envUsageInfo } from "./state";

export const envDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
        color: "#888",
        margin: "0 0 0 1em",
    },
});

/**
 * Decorate an open `.env` file in the editor by appending usage
 * information (used/unused and file snippets) to each environment key line.
 */
export function decorateEnvFile(editor: vscode.TextEditor) {
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
