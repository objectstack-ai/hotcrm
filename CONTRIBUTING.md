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
pnpm test
```

### Linting

```bash
pnpm lint
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

We use [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs across all packages in the monorepo.

### Adding a Changeset

When you make a change that affects the public API or user-facing behavior, add a changeset:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages are affected
2. Choose the version bump type (major, minor, patch)
3. Write a summary of the changes

The changeset will be saved as a file in `.changeset/` and should be committed with your PR.

### Changeset Guidelines

- **Major**: Breaking changes or significant new features
- **Minor**: New features that are backward compatible
- **Patch**: Bug fixes and small improvements

All packages in the monorepo use **linked releases** - when one package is released, all packages are released together with the same version number.

### Version Bumping

Maintainers will run this command to consume all changesets and update package versions:

```bash
pnpm version
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

> **Note**: Packages are published to a private GitHub Packages registry (`https://npm.pkg.github.com`) with `restricted` access. The `@hotcrm/core` and `@hotcrm/server` packages are excluded from publishing (marked `private: true`). See `docs/RELEASE_STRATEGY.md` for the full distribution strategy.

## 🔄 Pull Request Process

1. **Before Creating a PR**
   - Ensure all tests pass
   - Run linting and fix any issues
   - Update documentation if needed
   - Add tests for new features
   - **Add a changeset** if your changes affect package behavior

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

## 🚀 Publishing to ObjectStack Marketplace

If you've developed a plugin that you'd like to publish to the **ObjectStack Cloud Application Marketplace**, please refer to our comprehensive publishing guide:

- **Guide**: [docs/MARKETPLACE_PUBLISHING.md](docs/MARKETPLACE_PUBLISHING.md)

Before publishing, ensure your plugin:
- ✅ Meets the **minimum quality score** of 40/100 (5-dimension scoring)
- ✅ Passes **security scanning** (no critical/high vulnerabilities)
- ✅ Includes `objectstack.json` manifest file
- ✅ Conforms to `@objectstack/spec` v3.0.0
- ✅ Has comprehensive documentation (README, CHANGELOG, examples)
- ✅ Includes test coverage for hooks and actions

The publishing guide covers:
- Prerequisites and setup
- Plugin structure requirements
- Quality and security requirements
- Step-by-step publishing workflow
- Troubleshooting common issues

**Note**: Publishing to the marketplace requires a verified vendor account on ObjectStack Cloud.

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

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to HotCRM! 🔥
