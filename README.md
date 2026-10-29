# Option Chain Analyzer V4

Responsive option-chain analysis dashboard for Indian index options. Analysis only: **no order placement**.

## Current scaffold
- React + Vite frontend
- FastAPI backend
- Health/status endpoint
- Option-chain API contract and initial NSE adapter
- Credentials are configured on the backend only

## Project structure
```
frontend/   React dashboard
backend/    FastAPI service
```

## Run locally (Windows)
### Backend
1. Install Python 3.11 or newer.
2. Open a terminal in the `backend` folder.
3. Run:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
4. Open http://127.0.0.1:8000/docs

### Frontend
1. Install Node.js LTS.
2. Open a terminal in the `frontend` folder.
3. Run:
   ```powershell
   npm install
   npm run dev
   ```
4. Open the local URL printed by Vite.

## Important
- The dashboard may show demo/empty states until a live data provider is configured and tested.
- NSE may restrict automated requests or change its API. Do not treat data as live unless the status says so.
- Never commit Angel One API key, client code, PIN, password, TOTP/OTP, or session tokens.
- Do not put secrets in frontend environment variables. Frontend variables are visible to users.
- This application does not place trades.
