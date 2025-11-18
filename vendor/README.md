# Vendor Directory

This directory contains vendored dependencies that are not available on npm.

## idOS SDK

The idOS SDK packages are vendored here because `@idos-network/utils` is not published on npm, making it impossible to install the official npm packages.

### Packages Included

- **@idos-network/client@1.0.0-rc.1.1**
- **@idos-network/consumer@1.0.0-rc.1.1**
- **@idos-network/utils@1.0.0-rc.1.0**

### Source

Built from official release candidates:
- https://github.com/idos-network/idos-sdk-js/releases/tag/%40idos-network%2Fclient%401.0.0-rc.1.1
- https://github.com/idos-network/idos-sdk-js/releases/tag/%40idos-network%2Fconsumer%401.0.0-rc.1.1
- https://github.com/idos-network/idos-sdk-js/releases/tag/%40idos-network%2Futils%401.0.0-rc.1.1

### Updating

To update these packages:

1. Download the latest release source from GitHub
2. Install dependencies: `pnpm install`
3. Build the packages: `pnpm --filter "@idos-network/client" --filter "@idos-network/consumer" --filter "@idos-network/utils" build`
4. Copy the built `dist/` folders to this vendor directory
