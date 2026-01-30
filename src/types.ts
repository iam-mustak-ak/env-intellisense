import * as vscode from "vscode";

export type EnvUsageLocation = {
    uri: vscode.Uri;
    range: vscode.Range;
};

export type EnvUsageInfo = {
    count: number;
    files: Set<string>;
    locations: EnvUsageLocation[];
};
