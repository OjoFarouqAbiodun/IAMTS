# IAMTS — Standalone Portable Package

**ICT Assets Maintenance & Tracking System**

This folder is a **standalone / pre-compiled package** of the IAMTS
application. It bundles the application source and a **portable Node.js
runtime**, so it runs on any Windows 64-bit PC **without installing Node.js**.

> The only external requirement is a running **MySQL** server (5.7 or 8.0).

---

## Setup (first time only)

1. Make sure **MySQL** is installed and running.
2. Double-click **`install.bat`**.
   - It creates your `.env` file.
   - You will be prompted to edit `.env`: set `SESSION_SECRET` to a random
     long string and `DB_PASSWORD` to your MySQL root password.
   - It then creates the `iamts` database, tables, and **demo data**.
   - If no Admin exists, the initializer asks for the Admin name, email,
     department, and password.
3. When it finishes, run…

## Run

Double-click **`IAMTS.bat`**.
- A browser opens at `http://localhost:3000`.
- Keep the console window open (closing it stops the server).

## Demonstration Login

| Role       | Email                    | Password     |
|------------|--------------------------|--------------|
| Technician | sadebayo@iamts.com       | Password123! |
| Staff      | aogunleye@iamts.com      | Password123! |

The Admin login is the account created during installation. Change the
demonstration passwords before any real deployment.

## LAN access

Other computers on the same network can open `http://<YOUR-IP>:3000`.
Find your IP with `ipconfig`.

## Contents

- `node/` — bundled portable Node.js runtime
- `server/`, `client/`, `database/` — application source
- `docs/` — ERD, SDLC and architecture documentation
- `IAMTS.bat` — launcher
- `install.bat` — one-time setup
