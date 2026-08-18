# Hearth integration schedule

Create this task in the ChatGPT desktop app's Codex scheduled-tasks UI. The
desktop app and this computer must remain running.

- Name: `Hearth PR integrator`
- Project: `C:\Windows\System32\hearth`
- Cadence: every 5 minutes
- Execution environment: local protected checkout
- Prompt:

  `Use $hearth-integrator. Process at most one ready Hearth PR. Recover any pending merged SHA before selecting new work; if the atomic lock is busy, exit without changes.`

Do not schedule this task from a feature worktree. The repository hook and
skill will reject the wrong checkout, and Git's common-directory lock prevents
overlapping runs.
