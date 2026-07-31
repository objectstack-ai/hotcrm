# Contributing to HotCRM

Thank you for your interest in contributing to HotCRM! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- pnpm 9.0.0 or higher
- Git

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/hotcrm.git
   cd hotcrm
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Workflow

### Running the Development Server

```bash
pnpm dev
```

### Building the Project

```bash
pnpm build
```

### Running Tests

```bash
pnpm test          # vitest — metadata contracts + hook/flow runtime suites
pnpm test:e2e      # playwright — boots the server and drives the real API
pnpm test:coverage # vitest with a v8 coverage report
```

### Linting

```bash
pnpm lint
```

`pnpm lint` runs `objectstack lint`, which checks **metadata conventions** —
naming, field groups, relationship shapes, i18n coverage. It is not a
JavaScript/TypeScript style linter, and this repo does not use ESLint (a
stray `.eslintrc.json` sat here for a long time with no `eslint` package
installed anywhere to read it).

Code-level hygiene is enforced separately and does gate CI:

```bash
pnpm typecheck                       # tsc over src, test, e2e, and scripts
node scripts/check-source-hygiene.mjs # console.log / TODO / oversized files
```

## 🎯 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Follow existing code style and conventions
- Add type definitions for all functions and variables
- Avoid using `any` type unless absolutely necessary

### Code Style

- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Follow the Single Responsibility Principle

### Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or auxiliary tool changes
- `ci:` - CI/CD changes

Example:
```
feat: add smart briefing AI feature
fix: resolve memory leak in ObjectQL engine
docs: update README with new features
```

## 📦 Version Management

We use [Changesets](https://github.com/changesets/changesets) to manage the version and changelog of the `hotcrm` package. Since #502 took `apps/docs` out of the workspace, this is a single-package repo — every changeset targets `hotcrm`.

### Adding a Changeset

**Every PR must add a changeset.** The `Changeset Check` workflow fails a PR that
adds no `.changeset/*.md` file, so add one before you push:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages are affected
2. Choose the version bump type (major, minor, patch)
3. Write a summary of the changes

The changeset is saved as a file in `.changeset/` and **must be committed with your PR**.

The only escape hatch is the **`skip-changeset`** label, for PRs that genuinely
ship nothing to users — CI-only chores, dependency bumps handled by Dependabot,
repo housekeeping. If you are unsure, write the changeset; an entry too many is
cheaper than a release note nobody wrote.

### Changeset Guidelines

- **Major**: Breaking changes or significant new features
- **Minor**: New features that are backward compatible
- **Patch**: Bug fixes and small improvements

Write the summary for the person reading the release notes: what changed and why
it matters, not which files you touched. Breaking changes must spell out the
FROM → TO migration — that text ships to consumers as `CHANGELOG.md`.

`apps/docs` is versioned and deployed on its own and is not part of this flow.

### Version Bumping

Maintainers will run this command to consume all changesets and update package versions:

```bash
pnpm changeset:version
```

### Publishing

After versions are updated, maintainers can publish all packages:

```bash
pnpm release
```

This command runs `pnpm build && changeset publish`, which:
1. Compiles all TypeScript source into `dist/` (JavaScript + type declarations)
2. Publishes each non-private package to the configured npm registry

Only the compiled `dist/` folder is included in published packages (controlled by the `files` field in each `package.json`). Source code (`.ts` files) is **never** published to the registry.

> **Note**: Packages are published to a private GitHub Packages registry (`https://npm.pkg.github.com`) with `restricted` access. The root `hotcrm` package is `private: true` — Changesets versions it and writes its `CHANGELOG.md`, but never publishes it to a registry; the app ships through the marketplace instead (`pnpm publish:marketplace`). See `docs/RELEASE_STRATEGY.md` for the full distribution strategy.

## 🔄 Pull Request Process

1. **Before Creating a PR**
   - Run the full gate (`pnpm verify` — validate, typecheck, lint, hygiene, build, test)
   - Run the e2e suite if you touched hooks, flows, or actions (`pnpm test:e2e`)
   - Update documentation if needed
   - Add tests for new features
   - Update ROADMAP.md if the change completes a roadmap item
   - **Add a changeset** (`pnpm changeset`) — required on every PR, enforced by CI

2. **Creating a PR**
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues
   - Add screenshots for UI changes
   - Mark as draft if work is in progress

3. **After Submitting**
   - Respond to review comments promptly
   - Keep your branch up to date with main
   - Ensure CI checks pass

4. **Getting Merged**
   - At least one approval required
   - All CI checks must pass
   - No merge conflicts
   - Branch will be squash-merged

## 🐛 Reporting Bugs

Use the bug report template and include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots if applicable

## 💡 Suggesting Features

Use the feature request template and include:
- Clear description of the feature
- Problem it solves
- Proposed solution
- Benefits to users
- Implementation ideas (optional)

## 📚 Documentation

- Update README.md for major features
- Add JSDoc comments for public APIs
- Update relevant documentation files
- Include code examples where helpful

## 🧪 Testing

- Write tests for new features
- Maintain or improve code coverage
- Test edge cases
- Use descriptive test names

## 🤝 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone.

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Enforcement

Unacceptable behavior may be reported to the project maintainers.

## 📞 Getting Help

- Check existing documentation
- Search existing issues
- Ask in GitHub Discussions
- Contact maintainers

## 🏆 Recognition

Contributors will be:
- Listed in the project contributors
- Mentioned in release notes for significant contributions
- Invited to join the maintainers team for sustained contributions

## 📄 License

By contributing, you agree that your contributions will be licensed under the Apache License, Version 2.0.

---

Thank you for contributing to HotCRM! 🔥
