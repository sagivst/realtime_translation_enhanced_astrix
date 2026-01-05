

PostgreSQL GUI Access Installation Guide

Target VM: 20.170.155.53

Purpose

Provide mouse-based, web-accessible graphical management for PostgreSQL:
	•	View databases, schemas, tables
	•	Run SQL queries
	•	Inspect indexes, constraints, JSONB
	•	Monitor sessions and locks

The solution uses pgAdmin 4 (Web mode).

⸻

1. Assumptions (MANDATORY)
	•	OS: Ubuntu 20.04 / 22.04
	•	PostgreSQL is already installed and running
	•	You have sudo access
	•	VM is reachable at 20.170.155.53
	•	Port 3020 is already in use (NOT touched)

⸻

2. Install pgAdmin 4 (Web Mode)

2.1 Add pgAdmin repository

curl https://www.pgadmin.org/static/packages_pgadmin_org.pub | sudo apt-key add -
sudo sh -c 'echo "deb https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" > /etc/apt/sources.list.d/pgadmin4.list'

Update packages:

sudo apt update


⸻

2.2 Install pgAdmin 4 Web

sudo apt install -y pgadmin4-web


⸻

3. Initial pgAdmin Web Configuration (MANDATORY)

Run the setup script:

sudo /usr/pgadmin4/bin/setup-web.sh

You MUST provide:
	•	Email (admin login, e.g. admin@monitoring.local)
	•	Password (strong password)

Expected output:

pgAdmin 4 - Web setup complete


⸻

4. Verify pgAdmin Web Service

pgAdmin runs via Apache.

Check Apache status:

sudo systemctl status apache2

Expected:

Active: active (running)

If not running:

sudo systemctl start apache2
sudo systemctl enable apache2


⸻

5. Firewall Configuration (MANDATORY)

pgAdmin Web runs on port 80 by default.

Allow HTTP:

sudo ufw allow 80/tcp
sudo ufw reload

Verify:

sudo ufw status


⸻

6. Access pgAdmin from Browser

Open in browser:

http://20.170.155.53/pgadmin4

Login using:
	•	Email (from setup)
	•	Password

⸻

7. Register PostgreSQL Server in pgAdmin

Inside pgAdmin UI
	1.	Right-click Servers
	2.	Click Register → Server

General tab
	•	Name:

Monitoring-Postgres



Connection tab
	•	Host name/address:

localhost


	•	Port:

5432


	•	Maintenance database:

postgres


	•	Username:

postgres   (or your DB user)


	•	Password:

********


	•	✅ Check Save password

Click Save.

⸻

8. Result (Expected)

You now have:
	•	Full PostgreSQL tree view
	•	Tables / indexes / JSONB
	•	Query Tool with syntax highlighting
	•	Execution plans
	•	Session monitoring

This is suitable for:
	•	Inspecting metrics_agg_5s
	•	Inspecting audio_segments_5s
	•	Inspecting knob_snapshots_5s
	•	Debugging optimizer behavior

⸻

9. Security Rules (MANDATORY)
	•	pgAdmin is admin-level access
	•	In production:
	•	Restrict port 80 by IP (cloud firewall)
	•	OR place behind reverse proxy + auth
	•	PostgreSQL itself must remain bound to localhost

Verify Postgres binding:

sudo ss -lntp | grep 5432

Expected:

127.0.0.1:5432


⸻

10. Operational Notes
	•	pgAdmin is read/write — changes apply immediately
	•	pgAdmin does NOT affect Node.js / PM2 / monitoring services
	•	Safe to use while calls are active
	•	No restart required for PostgreSQL or STTTTSserver

⸻

11. Validation Checklist
	•	pgAdmin installed
	•	Apache running
	•	Port 80 open
	•	pgAdmin login works
	•	PostgreSQL server registered
	•	Tables visible and queryable

⸻

12. Explicit Non-Goals (Clarification)

This setup:
	•	❌ Does NOT expose PostgreSQL directly to the internet
	•	❌ Does NOT modify DB schema
	•	❌ Does NOT interfere with http://20.170.155.53:3020
	•	✅ Provides GUI only

⸻
