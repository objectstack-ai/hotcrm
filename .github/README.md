# GitHub Workflows and Automation

This directory contains all GitHub Actions workflows and automation configurations for HotCRM.

## 📋 Workflows Overview

### CI/CD Workflows

#### 1. **CI (Continuous Integration)** - `ci.yml`
- **Trigger**: Push and PR to main/develop branches
- **Jobs**: 
  - Install dependencies
  - Run linter (ESLint)
  - Build project (TypeScript compilation)
  - Run tests (Jest)
  - Upload build artifacts
- **Matrix**: Tests on Node.js 18.x and 20.x

#### 2. **Release** - `release.yml`
- **Trigger**: Push of version tags (v*.*.*)
- **Jobs**:
  - Build production artifacts
  - Create release archive
  - Generate release notes
  - Create GitHub release
- **Outputs**: Downloadable release package

#### 3. **Deploy Documentation** - `deploy-docs.yml`
- **Trigger**: Push to main or manual dispatch
- **Jobs**:
  - Build documentation site
  - Deploy to GitHub Pages
- **URL**: Available at GitHub Pages URL

### Security Workflows

#### 4. **CodeQL Security Analysis** - `codeql.yml`
- **Trigger**: Push, PR, and weekly schedule
- **Jobs**:
  - Initialize CodeQL
  - Analyze JavaScript/TypeScript code
  - Report security vulnerabilities
- **Queries**: Security and quality checks

### Code Quality Workflows

#### 5. **Code Quality** - `code-quality.yml`
- **Trigger**: PR to main/develop (code files only)
- **Checks**:
  - Console.log statements detection
  - TypeScript compilation
  - ESLint validation
  - TODO/FIXME comments
  - Large file detection

### Automation Workflows

#### 6. **PR Labeler** - `labeler.yml`
- **Trigger**: PR opened/updated
- **Action**: Auto-labels PRs based on changed files
- **Config**: `.github/labeler.yml`

#### 7. **Issue Management** - `issue-management.yml`
- **Trigger**: New issues and PRs
- **Actions**:
  - Greet first-time contributors
  - Auto-assign issues based on labels
  - Provide contribution guidelines

#### 8. **Stale Issues and PRs** - `stale.yml`
- **Trigger**: Daily schedule
- **Actions**:
  - Mark stale issues (60 days inactive)
  - Mark stale PRs (30 days inactive)
  - Auto-close after warning period
  - Remove stale label when updated

### Dependency Management

#### 9. **Dependabot** - `dependabot.yml`
- **Trigger**: Weekly schedule
- **Actions**:
  - Check npm dependencies
  - Check GitHub Actions versions
  - Create PRs for updates
- **Schedule**: Monday 09:00 Asia/Shanghai

## 🎯 Workflow Status Badges

Add these to your README.md:

```markdown
![CI](https://github.com/hotcrm/hotcrm/workflows/CI/badge.svg)
![CodeQL](https://github.com/hotcrm/hotcrm/workflows/CodeQL%20Security%20Analysis/badge.svg)
![Code Quality](https://github.com/hotcrm/hotcrm/workflows/Code%20Quality/badge.svg)
```

## 📝 Issue and PR Templates

### Issue Templates
- **Bug Report** - `ISSUE_TEMPLATE/bug_report.md`
- **Feature Request** - `ISSUE_TEMPLATE/feature_request.md`
- **Config** - `ISSUE_TEMPLATE/config.yml` (links to docs and security)

### PR Template
- **Pull Request** - `pull_request_template.md`
- Includes checklist for code quality and testing

## 🔧 Configuration Files

### Labeler Configuration - `labeler.yml`
Auto-labels based on file patterns:
- `documentation` - Docs and markdown files
- `dependencies` - package.json changes
- `ci/cd` - Workflow changes
- `backend` - Server and engine code
- `ui` - UI components
- `metadata` - Object definitions
- `configuration` - Config files

## 🚀 Usage

### Running Workflows Manually

Some workflows support manual triggering via GitHub UI:
1. Go to "Actions" tab
2. Select the workflow
3. Click "Run workflow"

### Triggering Releases

Create and push a version tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Viewing Workflow Results

1. Go to "Actions" tab in GitHub
2. Click on a workflow run
3. View logs and artifacts

## 📊 Workflow Permissions

Workflows use these permissions:
- **contents**: Read/write repository contents
- **issues**: Manage issues
- **pull-requests**: Manage PRs
- **security-events**: Report security findings
- **pages**: Deploy to GitHub Pages

## 🔐 Secrets Required

Most workflows use built-in `GITHUB_TOKEN`. Additional secrets needed:
- None currently required for basic functionality

## 🎨 Customization

### Modifying Workflows

1. Edit YAML files in `.github/workflows/`
2. Test changes in a PR
3. Workflows run automatically on PR

### Adding New Workflows

1. Create new `.yml` file in `.github/workflows/`
2. Define triggers and jobs
3. Test thoroughly before merging

### Updating Dependencies

Dependabot will automatically create PRs for:
- npm package updates (weekly)
- GitHub Actions updates (monthly)

## 📚 Best Practices

1. **Keep workflows focused** - One workflow per purpose
2. **Use caching** - Cache npm dependencies to speed up builds
3. **Matrix testing** - Test on multiple Node.js versions
4. **Fail fast** - Stop on first error to save resources
5. **Use latest actions** - Keep GitHub Actions up to date
6. **Document changes** - Update this README when adding workflows

## 🐛 Troubleshooting

### Workflow Fails
1. Check the logs in Actions tab
2. Verify all secrets are configured
3. Ensure dependencies are up to date
4. Test locally first

### Permission Issues
1. Check workflow permissions in YAML
2. Verify repository settings
3. Check if branch protection is blocking

### Caching Issues
1. Clear workflow cache in Actions settings
2. Regenerate package-lock.json
3. Update cache keys in workflow

## 📞 Support

For issues with workflows:
1. Check workflow logs
2. Review GitHub Actions documentation
3. Open an issue with workflow details
4. Contact maintainers

## 📄 License

These workflows are part of HotCRM and licensed under MIT License.

---

Built with ❤️ for automated excellence
