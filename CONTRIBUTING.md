# Contributing to HotCRM

Thank you for your interest in contributing to HotCRM! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
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
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Workflow

### Running the Development Server

```bash
npm run dev
```

### Building the Project

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
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

## 🔄 Pull Request Process

1. **Before Creating a PR**
   - Ensure all tests pass
   - Run linting and fix any issues
   - Update documentation if needed
   - Add tests for new features

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

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to HotCRM! 🔥
