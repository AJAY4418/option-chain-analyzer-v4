from __future__ import annotations

import time
from typing import Any

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

APP_VERSION = "4.0.0"
NSE_HOME = "https://www.nseindia.com"
NSE_EXPIRY_URL = "https://www.nseindia.com/api/option-chain-contract-info"
NSE_CHAIN_URL = "https://www.nseindia.com/api/option-chain-v3"

app = FastAPI(
    title="Option Chain Analyzer V4 API",
    version=APP_VERSION,
    description="Analysis-only API. It does not place orders.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

_nse_session: requests.Session | None = None
_nse_session_at = 0.0


def nse_session() -> requests.Session:
    """Create a short-lived session with browser-like headers and NSE cookies."""
    global _nse_session, _nse_session_at
    if _nse_session is not None and time.time() - _nse_session_at < 240:
        return _nse_session

    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/option-chain",
    })
    # NSE may refuse requests from automated/cloud IPs. Report this clearly.
    session.get(NSE_HOME, timeout=10)
    _nse_session = session
    _nse_session_at = time.time()
    return session


def nse_get(url: str, params: dict[str, str] | None = None) -> dict[str, Any]:
    try:
        response = nse_session().get(url, params=params, timeout=15)
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Unexpected NSE response format")
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "NSE data could not be retrieved. NSE may block this connection "
                "or its API response may have changed. Please retry later. "
                f"Technical detail: {type(exc).__name__}"
            ),
        ) from exc


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Option Chain Analyzer V4 API",
        "version": APP_VERSION,
        "mode": "analysis-only",
        "docs": "/docs",
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": APP_VERSION, "data_provider": "NSE adapter; not guaranteed live"}


@app.get("/api/symbols")
def symbols() -> dict[str, list[str]]:
    return {"symbols": ["NIFTY", "BANKNIFTY", "FINNIFTY"]}


@app.get("/api/option-chain")
def option_chain(
    symbol: str = Query(default="NIFTY", pattern="^(NIFTY|BANKNIFTY|FINNIFTY)$"),
    expiry: str | None = Query(default=None),
) -> dict[str, Any]:
    """Return NSE payload for the selected index and expiry; live availability varies."""
    params: dict[str, str] = {"symbol": symbol}
    if expiry:
        params["expiry"] = expiry

    # This endpoint is used by NSE's option-chain page for contract metadata/expiries.
    contract_info = nse_get(NSE_EXPIRY_URL, params={"symbol": symbol})
    expiry_dates = contract_info.get("expiryDates") or contract_info.get("expiry_dates") or []

    chosen_expiry = expiry
    if not chosen_expiry and expiry_dates:
        chosen_expiry = str(expiry_dates[0])

    if not chosen_expiry:
        raise HTTPException(
            status_code=502,
            detail="NSE response did not include expiry dates. Live data is unavailable right now.",
        )

    chain_params = {"type": "Indices", "symbol": symbol, "expiry": chosen_expiry}
    chain_payload = nse_get(NSE_CHAIN_URL, params=chain_params)

    return {
        "symbol": symbol,
        "expiry": chosen_expiry,
        "available_expiries": expiry_dates,
        "provider": "NSE",
        "live": True,
        "retrieved_at_epoch": int(time.time()),
        "data": chain_payload,
        "note": "Verify source timestamp and response structure before using for decisions.",
    }
