"""
FastAPI backend for AI-optimized logistics and fleet routing.

Run with:
    cd logistics_ai_project
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.algorithms.knapsack import assign_orders_to_vans
from backend.algorithms.routing import compute_van_route
from backend.algorithms.triage import sort_orders_by_priority
from backend.models.schemas import (
    OptimizeRequest,
    OptimizeResponse,
    Order,
    VanRoute,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("logistics_ai")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Logistics AI Optimizer",
    description="AI-optimized fleet routing using QuickSort, 0/1 Knapsack, and TSP.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_DATA_PATH = Path(__file__).parent / "data" / "mock_orders.json"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root() -> dict:
    """Health-check endpoint."""
    return {"status": "ok", "service": "logistics-ai-optimizer", "version": "2.1.0"}


@app.get("/mock-orders", response_model=list[Order])
def get_mock_orders() -> list[Order]:
    """Return the mock orders from disk."""
    try:
        raw = json.loads(MOCK_DATA_PATH.read_text())
        return [Order(**o) for o in raw]
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Mock data file not found.")
    except json.JSONDecodeError as exc:
        logger.error("Invalid JSON in mock data file: %s", exc)
        raise HTTPException(status_code=500, detail="Mock data file contains invalid JSON.")
    except Exception as exc:
        logger.exception("Failed to load mock orders")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(request: OptimizeRequest) -> OptimizeResponse:
    """
    Receive a list of orders, optimise van assignments and routes.

    Pipeline: sort by priority → knapsack packing → TSP routing.
    """
    t0 = time.perf_counter()
    logger.info("Optimize request received — %d orders", len(request.orders))

    try:
        # 1. Sort orders by priority (descending) using QuickSort
        sorted_orders = sort_orders_by_priority(request.orders)
        logger.info("Step 1/3: Sorted %d orders by priority", len(sorted_orders))

        # 2. Assign orders to vans using 0/1 Knapsack (max 50 kg per van)
        van_assignments = assign_orders_to_vans(sorted_orders)
        logger.info("Step 2/3: Assigned orders to %d vans", len(van_assignments))

        # 3. Compute optimal route for each van using Dijkstra + TSP
        vans: list[VanRoute] = []
        total_dist = 0.0
        for idx, van_orders in enumerate(van_assignments, start=1):
            route, distance = compute_van_route(van_orders)
            van_weight = sum(o.weight for o in van_orders)
            vans.append(
                VanRoute(
                    id=f"van_{idx}",
                    route=route,
                    distance=distance,
                    total_weight=round(van_weight, 2),
                    order_count=len(van_orders),
                )
            )
            total_dist += distance
            logger.debug(
                "Van %d: %d orders, %.2f km, %.1f kg",
                idx, len(van_orders), distance, van_weight,
            )

        elapsed = time.perf_counter() - t0
        elapsed_ms = round(elapsed * 1000, 2)
        logger.info(
            "Optimisation complete — %d vans, %.2f km total, %.1f ms",
            len(vans),
            total_dist,
            elapsed_ms,
        )

        return OptimizeResponse(
            vans=vans,
            total_orders=len(request.orders),
            total_distance=round(total_dist, 2),
            elapsed_ms=elapsed_ms,
        )

    except ValueError as exc:
        logger.warning("Validation error: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error in /optimize")
        raise HTTPException(status_code=500, detail="Internal optimisation error.")
