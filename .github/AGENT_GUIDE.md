# AI Agent Guide

The following directories contain the "Brain" of the HotCRM development process.

- `instructions/`: **Role-Based Handbooks**. Define HOW to write code for specific domains (Metadata, Logic, UI).
- `tasks/`: **Prompt Templates**. Ready-to-use prompts to copy-paste into your AI chat window.
- `copilot-instructions.md`: **System Prompt**. The meta-instructions for GitHub Copilot.

## Workflow

1.  **Define**: Create an Issue using `ISSUE_TEMPLATE/ai_task.yml`.
2.  **Prompt**: Copy a template from `tasks/` and fill it with details from the Issue.
3.  **Execute**: Paste into Copilot/Cursor/Windsurf.
4.  **Review**: Verify against the standards in `instructions/`.
