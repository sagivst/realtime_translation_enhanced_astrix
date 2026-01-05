Below is a clear, mandatory, step-by-step English installation document for enabling mouse-driven GUI control of your Linux VM at
http://20.170.155.53:3020/
(using the recommended solution: NoMachine).

This document is written for a development / operations team and contains no alternatives or options.

⸻

GUI Remote Control Installation Guide

Target VM: 20.170.155.53

Purpose

Enable full graphical desktop access with mouse and keyboard to the VM, similar to macOS or Windows, for development, debugging, and monitoring.

The solution uses NoMachine (NX), which provides:
	•	High-performance remote desktop
	•	Mouse + windowed GUI
	•	Clipboard support
	•	Secure SSH-based transport

⸻

1. Assumptions (MANDATORY)
	•	VM OS: Ubuntu 20.04 / 22.04 (Linux)
	•	SSH access to the VM is already available
	•	You have sudo privileges
	•	The VM is reachable at 20.170.155.53

⸻

2. Install a Lightweight Desktop Environment (XFCE)

NoMachine requires a desktop environment.

Run on the VM (via SSH)

sudo apt update
sudo apt install -y xfce4 xfce4-goodies

Verify installation:

xfce4-session --version


⸻

3. Install NoMachine Server on the VM

Download and install

cd /tmp
wget https://download.nomachine.com/download/8.11/Linux/nomachine_8.11.3_1_amd64.deb
sudo dpkg -i nomachine_8.11.3_1_amd64.deb

Fix dependencies if required:

sudo apt -f install -y


⸻

4. Verify NoMachine Service Is Running

sudo systemctl status nxserver

Expected result:

Active: active (running)

If not running:

sudo systemctl start nxserver
sudo systemctl enable nxserver


⸻

5. Firewall Configuration (MANDATORY)

NoMachine uses TCP port 4000.

Allow the port

sudo ufw allow 4000/tcp
sudo ufw reload

Verify:

sudo ufw status


⸻

6. Desktop Session Configuration (MANDATORY)

Ensure NoMachine uses XFCE.

Create or edit:

sudo nano /usr/NX/etc/node.cfg

Set or verify:

DefaultDesktopCommand "/usr/bin/startxfce4"

Restart NoMachine:

sudo systemctl restart nxserver


⸻

7. Client-Side Setup (Your Computer)

Install NoMachine Client

Download from:

https://www.nomachine.com/download

Available for:
	•	macOS
	•	Windows
	•	Linux

⸻

8. Connect to the VM (GUI Access)
	1.	Open NoMachine
	2.	Click “Add” / “New Connection”
	3.	Protocol: NX
	4.	Host:

20.170.155.53


	5.	Port:

4000


	6.	Authentication:
	•	Username: your Linux user
	•	Password: your Linux password
	7.	Desktop:
	•	Select Create a new virtual desktop

Click Connect.

⸻

9. Result (Expected)

After successful connection:
	•	Full Linux desktop appears
	•	Mouse, keyboard, windows enabled
	•	Terminal, browser, file manager available
	•	Suitable for:
	•	Monitoring dashboards
	•	Debugging services
	•	Visual inspection
	•	Log analysis

⸻

10. Security Notes (MANDATORY)
	•	Port 4000 must be exposed only to trusted IPs in production
	•	SSH access must remain enabled for recovery
	•	NoMachine traffic is encrypted
	•	No services on 3020 are affected by this setup

⸻

11. Service Interaction Clarification

This setup:
	•	Does NOT interfere with
http://20.170.155.53:3020/
	•	Does NOT modify:
	•	Node.js services
	•	PM2
	•	Monitoring stack
	•	Is purely an administrative GUI layer

⸻

12. Validation Checklist
	•	XFCE installed
	•	NoMachine installed
	•	nxserver running
	•	Port 4000 open
	•	GUI connection successful

⸻
