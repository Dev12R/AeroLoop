# Getting AeroLoop running on your machine

This project has two parts that both need to be running at the same time:

- a **backend** (Python) that fetches live weather/pollution data and runs the forecast model
- a **frontend** (a website) that you open in your browser to see the dashboard

You'll need **two terminal windows open at once** — one running the backend, one
running the frontend. Leave both open while you use the app.

## 0. Before you start

Check whether these are already installed by opening a terminal and running:

```
python --version
node --version
```

- If `python --version` fails or shows something below 3.10, install Python from
  https://www.python.org/downloads/ (on the installer, tick **"Add Python to PATH"**).
- If `node --version` fails or shows something below 18, install Node.js (LTS) from
  https://nodejs.org/.

You also need an internet connection — the app pulls live weather and air-quality
data every time you load a page.

> **Windows users:** use PowerShell for every command below (search "PowerShell"
> in the Start menu). **Mac/Linux users:** use Terminal, and swap `python` for
> `python3` if `python` isn't found, and use `source .venv/bin/activate` where
> noted instead of the Windows activation line.

## 1. Unzip / copy the folder

Put the `AeroLoop` folder anywhere you like — Desktop is fine. You should see
`backend/`, `frontend/`, `docs/`, and this file inside it.

## 2. Start the backend (terminal window #1)

```powershell
cd AeroLoop\backend
python -m venv .venv
```

Activate the virtual environment:

- **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1`
- **Mac/Linux:** `source .venv/bin/activate`

If Windows blocks the activation script with a "running scripts is disabled"
error, run this once and try again: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Then install the dependencies and start the server:

```powershell
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Leave this running. You should see a line like `Uvicorn running on
http://127.0.0.1:8010`. **Don't close this window.**

To check it worked, open http://127.0.0.1:8010/api/health in a browser — it
should show `{"status":"ok",...}`.

## 3. Start the frontend (terminal window #2 — a *new* terminal)

```powershell
cd AeroLoop\frontend
npm install
npm run dev
```

This will print a URL, usually `http://localhost:5173/`. **Don't close this
window either.**

## 4. Open the app

Open the URL from step 3 in your browser (Chrome, Edge, Firefox all work). You
should see the AeroLoop dashboard with a sidebar (Dashboard, Inversion Tracker,
Stubble Plume, Station Compare, Methodology).

It can take a few seconds to load on first open since it's fetching live
forecast data — that's normal.

## 5. When you're done

Go to each terminal window and press `Ctrl+C` to stop the servers.

## Optional: live stubble-fire data

By default, fire activity for the stubble-burning tracker uses a realistic
seasonal model (clearly labeled as such in the app) rather than live satellite
data. If you want the real thing:

1. Get a free key at https://firms.modaps.eosdis.gov/api/area/
2. Before starting the backend in step 2, set it as an environment variable:
   - **Windows (PowerShell):** `$env:FIRMS_MAP_KEY = "your-key-here"`
   - **Mac/Linux:** `export FIRMS_MAP_KEY=your-key-here`
3. Then run the `uvicorn` command as normal.

This step is entirely optional — the app works fully without it.

## Troubleshooting

**"address already in use" / port 8010 or 5173 already taken**
Something else on your machine is using that port. For the backend, change
`--port 8010` to another number (e.g. `8011`) in step 2, and also update
`VITE_API_BASE_URL` — copy `frontend/.env.example` to `frontend/.env.local` and
change the port number in it before step 3. For the frontend, Vite will
usually just offer you a different port automatically — use whatever URL it
prints.

**The dashboard loads but shows a red "Couldn't reach the AeroLoop backend" error**
Make sure the backend terminal (step 2) is still running and didn't crash —
scroll up in that window for an error message. Also confirm you can open
http://127.0.0.1:8010/api/health directly in a browser.

**`pip install` or `npm install` fails / hangs**
Usually a network/proxy issue — check your internet connection and try again.
If you're on a restricted corporate network, some package registries may be
blocked.

**Charts/map look empty or broken**
Try a hard refresh (Ctrl+Shift+R). If it persists, check the backend terminal
for errors — it logs every request it handles.
