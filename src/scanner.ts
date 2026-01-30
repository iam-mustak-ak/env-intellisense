import * as vscode from "vscode";
import { envUsageInfo, envVariables } from "./state";

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

    // env("VAR") or env('VAR')
    (env: string) => new RegExp(`\\benv\\(['"\`]${env}['"\`]\\)`, "g"),
];

/**
 * Load environment variable names from all `.env*` files in the workspace.
 * Populates the `envVariables` set by reading each env file and parsing keys.
 */
export async function loadEnvVariables() {
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
export async function scanEnvUsage() {
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
