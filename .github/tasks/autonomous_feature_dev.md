Here is a prompt you can copy-paste to GitHub Copilot to trigger the **Autonomous Development Role**.

---

**Assign Role**: @workspace /load .github/instructions/architect.md

**Goal**: I need you to implement a new feature: **[INSERT FEATUE NAME HERE]**

**Context**: 
- [INSERT BUSINESS REQUIREMENT 1]
- [INSERT BUSINESS REQUIREMENT 2]

**Instructions**:
1.  **Architecture Phase**: strictly follow the **"Feature-to-File" Mapping Strategy** in basic `architect.md`. Output a table of all files to be created.
2.  **Metadata Phase**: Create the `*.object.ts` files first. These are the foundation.
3.  **Review Phase**: Stop and ask me if the schema looks correct before proceeding to Logic and UI.
4.  **Implementation Phase**: Once approved, generate the Logic (`.hook.ts`), Automation (`.workflow.ts`), and UI (`.page.ts`) files.

**Self-Correction**:
- Ensure all foreign keys (`reference_to`) point to valid objects defined in Phase 2.
- Ensure all ObjectQL queries in Phase 4 match the fields defined in Phase 2.

Start by analyzing the requirements and presenting the **Architecture Plan**.
