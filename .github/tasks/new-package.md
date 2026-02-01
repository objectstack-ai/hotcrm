# Task: Scaffold New Package

**Goal**: Create a new business module in `packages/`.

**Prompt**:
```markdown
I want to create a new solution package named: `[PACKAGE_NAME]`.
Description: [DESCRIPTION]

Please scaffold the package structure using the Architect Guidelines:
1. Create `packages/[PACKAGE_NAME]/package.json` with correct name and peerDeps.
2. Create `packages/[PACKAGE_NAME]/tsconfig.json` extending base.
3. Create `packages/[PACKAGE_NAME]/src/index.ts` as entry point.
4. Update `base.tsconfig.json` to include the new path if necessary (or just verify standard glob patterns cover it).
```
