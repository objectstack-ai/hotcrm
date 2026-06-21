# Task: Implement New Feature

**Goal**: Add a functional vertical slice (Object + Logic + UI).

**Start from the requirement**: this feature should trace to a record under
[`docs/requirements/`](../../docs/requirements/README.md). Read its **disposition**
first — `B` (standard enhancement) lands in core `src/{type}/`; `C`
(customer-specific) belongs in an overlay/extension package, **not** in HotCRM core.

**Prompt**:
```markdown
I want to add a `[FEATURE_NAME]` feature to HotCRM (single app, namespace `crm`),
implementing requirement `REQ-[NNNN]`.

**Requirements**:
1. **Model**: Create `src/objects/[OBJECT_NAME].object.ts` with fields: [LIST_FIELDS]. Use the `crm_` prefix.
2. **Logic**: Create `src/objects/[OBJECT_NAME].hook.ts` to implement: [DESCRIBE_LOGIC].
3. **UI**: Create `src/views/[OBJECT_NAME].view.ts` and `src/pages/[OBJECT_NAME].page.ts` for a standard record layout.

Please follow the strictly typed metadata standards in `.github/instructions/metadata.md`.
```
