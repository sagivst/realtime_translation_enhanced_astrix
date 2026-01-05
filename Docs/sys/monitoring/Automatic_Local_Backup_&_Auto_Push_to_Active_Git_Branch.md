
Automatic Local Backup + Auto Push to Active Git Branch

Developer Setup & Workflow Specification

⸻

1. Goal

Ensure that before making changes to files, the current state of the project is:
	1.	Saved locally
	2.	Committed to Git
	3.	Automatically pushed to the currently active Git branch on GitHub

This provides:
	•	Continuous backup
	•	Zero risk of losing working code
	•	Full traceability of changes
	•	Minimal manual effort

⸻

2. Core Principle

Git is the backup system.

Every “backup” is:
	•	A Git commit
	•	On the active branch
	•	Pushed to GitHub

There are no separate backup files, folders, or tools.

⸻

3. Requirements

Required Software
	•	Git ≥ 2.25
	•	Access to GitHub repository
	•	SSH authentication configured (recommended)

Verify:

git --version


⸻

4. One-Time Repository Setup

4.1 Ensure You Are on a Branch (Not Detached HEAD)

git branch

You should see something like:

* feature/monitoring

If needed:

git checkout -b feature/my-work


⸻

4.2 Set Up Upstream (Once per Branch)

git push -u origin HEAD

After this, git push will always push to the active branch automatically.

⸻

5. Automatic Backup Command (Recommended)

5.1 Create a Git Alias (Global)

Edit your global Git config:

git config --global --edit

Add:

[alias]
  autobackup = "!git add -A && git commit -m \"backup: auto snapshot before change\" && git push"


⸻

5.2 Usage

Before you start editing files, run:

git autobackup

This will automatically:
	1.	Stage all current changes
	2.	Create a backup commit
	3.	Push it to the active GitHub branch

✔ Local backup
✔ Remote backup
✔ Zero context switching

⸻

6. Enforcing Backup Before Changes (Advanced – Optional but Strongly Recommended)

6.1 Git Pre-Commit Hook (Local)

Create a hook that prevents commits without a prior backup.

mkdir -p .git/hooks
nano .git/hooks/pre-commit

Add:

#!/bin/sh
echo "⚠️  Ensure you ran 'git autobackup' before making changes."
exit 0

Make executable:

chmod +x .git/hooks/pre-commit

This acts as a reminder, not a blocker.

⸻

7. Fully Automatic Backup via File Save (Optional – Editor-Based)

Git cannot detect file edits automatically by itself.
This requires editor integration.

7.1 VS Code Example

Install extension:
	•	Run on Save
	•	Or Save and Run

Configure to run:

git autobackup

on save of selected file types.

⚠️ Use carefully to avoid too many commits.

⸻

8. Recovery Workflow (Why This Works)

Restore a File to the Last Backup

git checkout HEAD~1 -- path/to/file.js

View All Backups

git log --oneline --grep="backup:"

Revert Entire Project

git reset --hard <commit-hash>


⸻

9. Rules for the Team (Recommended Policy)
	•	Every work session starts with:

git autobackup


	•	No direct work on main
	•	Small commits are encouraged
	•	Backup commits may be squashed later if needed

⸻

10. What This System Does NOT Do (By Design)
	•	❌ No background daemon
	•	❌ No polling
	•	❌ No auto-commits without user intent
	•	❌ No file duplication

This keeps the system safe, predictable, and auditable.

⸻

11. Summary

Before editing any file:

git autobackup

This guarantees:
	•	Local save
	•	Git commit
	•	GitHub push
	•	Active branch always backed up

Git becomes a live safety net, not just version control.
