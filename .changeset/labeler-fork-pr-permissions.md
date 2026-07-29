---
'hotcrm': patch
---

Fix the PR Labeler workflow failing on every pull request opened from a fork.

`labeler.yml` triggered on `pull_request`, which hands a **read-only**
`GITHUB_TOKEN` to runs originating from a forked repository — the job-level
`permissions: pull-requests: write` is silently downgraded, it is not an error
GitHub reports up front. `actions/labeler` therefore got a 403 on
`set-labels-for-an-issue` and the check went red on every contributor PR, while
same-repo Dependabot PRs labelled fine and masked the problem.

The trigger is now `pull_request_target`, which runs in the base repo's context
where the requested write scope is actually granted. The `actions/checkout` step
is gone with it: checking out under `pull_request_target` is the well-known
privileged-code-execution footgun, and it was never needed — `actions/labeler`
resolves `.github/labeler.yml` over the API at the base commit, so the label
rules always come from the base branch and a fork cannot substitute its own.
