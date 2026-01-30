# Changelog

All notable changes to the **env-intellisense** extension will be documented in this file.

This project follows the recommendations of  
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)  
and uses [Semantic Versioning](https://semver.org/).

---

## [1.1.3] - 2026-01-30

### Added
-   Support for `env("VAR")` and `env('VAR')` usage tracking and IntelliSense.
-   Codebase refactoring for better modularity and maintainability.

## [1.1.1] - 2026-01-03

### Fixed

-   Fixed extension not activating automatically after installation
-   Added proper `activationEvents` for JS/TS files and `.env` workspaces

### Added

-   Support for multiple environment variable access patterns:
    -   `process.env.VAR`
    -   `import.meta.env.VAR`
    -   `env.VAR`
-   Improved usage detection reliability across files

### Improved

-   More stable workspace scanning
-   Better handling of file change events

---

## [1.1.0] - 2026-01-01

### Added

-   Initial release of **env-intellisense**
-   Environment variable IntelliSense from `.env` files
-   Workspace-wide usage counting
-   Inline usage display inside `.env` files
-   File path tracking for env variable usage
-   Ctrl / Cmd + Click navigation to usage locations
-   Live updates with debounced scanning
