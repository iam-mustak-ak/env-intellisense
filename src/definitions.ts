import * as vscode from "vscode";
import { envUsageInfo } from "./state";

export const envDefinitionProvider: vscode.DefinitionProvider = {
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
};
