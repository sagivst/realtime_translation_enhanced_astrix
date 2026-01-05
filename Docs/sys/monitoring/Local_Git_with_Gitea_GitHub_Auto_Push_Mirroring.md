
Local Git Development with Gitea → GitHub Automatic Push Mirroring

Engineering Workflow & Configuration Specification

⸻

1. Objective

Define a development workflow where:
	•	Development is performed on a local Git repository hosted on a VM
	•	The repository is served via Gitea (self-hosted Git UI)
	•	Gitea is the single source of truth
	•	All changes are automatically mirrored (push-only) to GitHub
	•	GitHub acts as:
	•	Off-site backup
	•	Read-only browsing UI
	•	Optional CI/CD trigger source

This document defines the official and mandatory workflow.

⸻

2. High-Level Architecture

Developer
   ↓
Local Git Repository (VM)
   ↓
Gitea (Primary / Authoritative)
   ↓  (Automatic Push Mirror)
GitHub (Mirror / Backup / Read-only)

	•	All development happens against Gitea
	•	GitHub never pushes back
	•	Synchronization is one-way only

⸻

3. Core Principles
	1.	Gitea is the single source of truth
	2.	GitHub is a push mirror only
	3.	All branches are mirrored
	4.	No bidirectional synchronization
	5.	Git is the only backup mechanism

⸻

4. Requirements

Software
	•	Git ≥ 2.25
	•	Gitea ≥ 1.20 (self-hosted)
	•	GitHub account with repository created
	•	SSH key or GitHub Personal Access Token (PAT)

⸻

5. Initial Setup (One-Time)

5.1 Create / Import Repository into Gitea

Options:
	•	Create a new repository in Gitea
	•	Or import an existing local repository

Repository example:

realtime_translation_enhanced_astrix


⸻

5.2 Developer Clone (Standard)

Developers must clone from Gitea only:

git clone git@<gitea-host>:ORG/realtime_translation_enhanced_astrix.git
cd realtime_translation_enhanced_astrix

GitHub must never be used as a development remote.

⸻

6. GitHub Push Mirror Configuration (Gitea UI)

This section defines the mandatory automatic mirroring setup.

⸻

6.1 Create GitHub Access Token

On GitHub:
	1.	Go to Settings → Developer settings → Personal access tokens
	2.	Create a Fine-grained token (or classic PAT)
	3.	Required permissions:
	•	Repository → Contents: Read & Write
	4.	Copy and store the token securely

⸻

6.2 Configure Push Mirror in Gitea

In Gitea:
	1.	Open the repository
	2.	Go to Settings
	3.	Select Mirrors
	4.	Click Add New Mirror
	5.	Choose Push Mirror

⸻

6.3 Push Mirror Configuration

Fill the fields exactly:

Field	Value
Repository URL	https://github.com/ORG/REPO.git
Mirror Direction	Push
Authentication	Username + GitHub token
Mirror Interval	On push
Enable	✔

Example:

https://github.com/sagivst/realtime_translation_enhanced_astrix.git


⸻

6.4 Save and Enable
	•	Save the mirror
	•	Gitea will immediately validate credentials
	•	From this point on:
	•	Every push to Gitea automatically pushes to GitHub

No developer action is required.

⸻

7. Mandatory Developer Workflow

7.1 Backup Before Changes (Required)

Before modifying any file:

git add -A
git commit -m "backup: snapshot before change"
git push

Result:
	•	Commit stored in Gitea
	•	Automatically mirrored to GitHub

⸻

7.2 Normal Development

git commit -m "work: describe change"
git push

Mirror happens automatically.

⸻

7.3 Branching Rules
	•	All work must be done on branches
	•	Branches are mirrored automatically

Example:

git checkout -b feature/monitoring-ui
git push


⸻

8. Recovery & Rollback

Restore a file:

git checkout HEAD~1 -- path/to/file.js

Roll back entire repository:

git reset --hard <commit>
git push --force

⚠ Force-push affects both Gitea and GitHub mirror.

⸻

9. GitHub Usage Policy

GitHub IS used for:
	•	Browsing code
	•	Viewing branches
	•	Viewing commit history
	•	CI/CD triggers (optional)

GitHub IS NOT used for:
	•	Development
	•	Editing
	•	Pull requests
	•	Hotfixes
	•	Conflict resolution

All changes must go through Gitea.

⸻

10. Security Model
	•	One-way push only
	•	GitHub has no authority
	•	Tokens stored only in Gitea
	•	SSH preferred internally
	•	No scheduled pull mirroring

⸻

11. Failure Scenarios & Behavior

Scenario	Result
GitHub unavailable	Gitea continues working
Mirror fails	Error logged in Gitea
VM failure	GitHub contains full backup
Accidental deletion	Recoverable from GitHub


⸻

12. Operational Checklist

Daily Developer Flow

git pull
git commit (backup)
git push

Admin Responsibilities
	•	Monitor mirror status in Gitea UI
	•	Rotate GitHub tokens
	•	Ensure GitHub repo remains private/read-only

⸻

13. Summary

This setup guarantees:
	•	Zero data loss
	•	Continuous off-site backup
	•	Clean separation of concerns
	•	Minimal developer overhead
	•	Professional, production-safe Git workflow

Gitea is authoritative. GitHub is a mirror.

⸻
