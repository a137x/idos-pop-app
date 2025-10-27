# Vendor Directory

This directory contains vendored dependencies that are not available on npm or have broken npm packages.

## idOS SDK

The idOS SDK packages are included here because:

1. **`@idos-network/utils` is NOT published on npm** - While `@idos-network/client` and `@idos-network/consumer` exist on npm, they have a dependency on `@idos-network/utils@1.0.0-rc.1.0` which returns a 404 error from npm registry.

2. **We only include essential files**:
   - `package.json` (with fixed dependencies - replaced `catalog:` and `workspace:` protocols with actual versions)
   - `dist/` folder (compiled JavaScript and TypeScript definitions)
   - **Source maps excluded** to reduce size (~70% size reduction)

3. **Size**: Only **1.4MB** total (vs 4.6MB with source maps)

4. **Files**: 29 files total across 3 packages

### Packages Included

- **@idos-network/client@1.0.0-rc.1.2** - Browser SDK for idOS
- **@idos-network/consumer@1.0.0-rc.1.2** - Server SDK for idOS credential verification
- **@idos-network/utils@1.0.0-rc.1.1** - Utility functions (codecs, encryption, etc.)

### Source

Original source: https://github.com/idos-network/idos-sdk-js

### Updating

To update these packages:

1. Clone/pull the latest from https://github.com/idos-network/idos-sdk-js
2. Build the packages: `pnpm install && pnpm build`
3. Copy only the `dist/` folders and `package.json` files
4. Update the `package.json` files to replace `catalog:` and `workspace:` references with actual npm versions
5. Remove `.map` files to save space

### Why Not Use npm?

We attempted to use the published npm packages, but they have broken dependencies:
- `npm install @idos-network/client` tries to install `@idos-network/utils@1.0.0-rc.1.0`
- This package doesn't exist on npm (404 error)
- The idOS team either forgot to publish it or bundle it properly

This has been reported to the idOS team.
