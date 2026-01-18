"""
Zaagplan Optimizer - FastAPI Backend
REST API voor 1D en 2D optimalisatie

Auteur: 3BM Bouwkunde
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from optimizer_1d import (
    Optimizer1D, 
    Part, 
    Stock, 
    Algorithm, 
    result_to_dict,
    ORTOOLS_AVAILABLE
)

app = FastAPI(
    title="Zaagplan Optimizer API",
    description="REST API voor 1D en 2D zaagplan optimalisatie",
    version="2.0.0"
)

# CORS voor frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In productie: specifieke origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ REQUEST MODELS ============

class PartInput(BaseModel):
    id: str
    length: float
    quantity: int = 1
    label: Optional[str] = None


class StockInput(BaseModel):
    id: str
    length: float
    quantity: int = -1
    cost: float = 1.0
    label: Optional[str] = None


class Optimize1DRequest(BaseModel):
    parts: List[PartInput]
    stocks: List[StockInput]
    kerf: float = 3.0
    algorithm: str = "hybrid"


# ============ ENDPOINTS ============

@app.get("/")
def root():
    """Health check en info"""
    return {
        "service": "Zaagplan Optimizer API",
        "version": "2.0.0",
        "status": "running",
        "ortools_available": ORTOOLS_AVAILABLE,
        "algorithms_1d": [a.value for a in Algorithm],
    }


@app.get("/algorithms")
def get_algorithms():
    """Lijst van beschikbare algoritmes"""
    return {
        "1d": [
            {
                "id": "ortools_optimal",
                "name": "OR-Tools Optimaal",
                "description": "Exacte oplossing via Column Generation. Beste resultaat, kan langzamer zijn bij veel onderdelen.",
                "available": ORTOOLS_AVAILABLE
            },
            {
                "id": "ortools_fast",
                "name": "OR-Tools Snel",
                "description": "Snelle heuristiek via OR-Tools MIP solver.",
                "available": ORTOOLS_AVAILABLE
            },
            {
                "id": "ffd",
                "name": "First Fit Decreasing",
                "description": "Simpele greedy heuristiek. Zeer snel, ~15-20% suboptimaal.",
                "available": True
            },
            {
                "id": "hybrid",
                "name": "Hybrid (Aanbevolen)",
                "description": "Combinatie: grote stukken eerst, kleine stukken in reststukken. Goede balans snelheid/kwaliteit.",
                "available": True
            }
        ],
        "2d": [
            {
                "id": "maxrects",
                "name": "MaxRects (Huidig)",
                "description": "Greedy rechthoek-packing. Snel maar niet optimaal.",
                "available": True
            },
            {
                "id": "nfp",
                "name": "NFP Nesting (Planned)",
                "description": "No-Fit Polygon voor irreguliere vormen. In ontwikkeling.",
                "available": False
            }
        ]
    }


@app.post("/optimize/1d")
def optimize_1d(request: Optimize1DRequest):
    """
    Optimaliseer 1D zaagplan
    
    Body:
    - parts: Lijst van onderdelen met id, length, quantity
    - stocks: Lijst van voorraad met id, length
    - kerf: Zaagsnede breedte (default: 3mm)
    - algorithm: ortools_optimal | ortools_fast | ffd | hybrid
    """
    # Valideer algorithm
    try:
        algo = Algorithm(request.algorithm)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Onbekend algoritme: {request.algorithm}. "
                   f"Kies uit: {[a.value for a in Algorithm]}"
        )
    
    # Check OR-Tools beschikbaarheid
    if algo in [Algorithm.ORTOOLS_OPTIMAL, Algorithm.ORTOOLS_FAST] and not ORTOOLS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="OR-Tools is niet geïnstalleerd op de server. "
                   "Gebruik 'hybrid' of 'ffd' algoritme."
        )
    
    # Converteer input
    parts = [
        Part(
            id=p.id,
            length=p.length,
            quantity=p.quantity,
            label=p.label or p.id
        )
        for p in request.parts
    ]
    
    stocks = [
        Stock(
            id=s.id,
            length=s.length,
            quantity=s.quantity,
            cost=s.cost,
            label=s.label or f"{s.length}mm"
        )
        for s in request.stocks
    ]
    
    # Validatie
    if not parts:
        raise HTTPException(status_code=400, detail="Geen onderdelen opgegeven")
    if not stocks:
        raise HTTPException(status_code=400, detail="Geen voorraad opgegeven")
    
    # Optimaliseer
    optimizer = Optimizer1D(kerf=request.kerf)
    result = optimizer.optimize(parts, stocks, algo)
    
    return result_to_dict(result)


# ============ 2D PLACEHOLDER ============

@app.post("/optimize/2d")
def optimize_2d():
    """2D optimalisatie - nog niet geïmplementeerd via backend"""
    raise HTTPException(
        status_code=501,
        detail="2D optimalisatie via backend is nog in ontwikkeling. "
               "Gebruik de frontend maxrects-packer voor nu."
    )


# ============ RUN SERVER ============

if __name__ == "__main__":
    print("=" * 60)
    print("ZAAGPLAN OPTIMIZER API")
    print("=" * 60)
    print(f"OR-Tools beschikbaar: {ORTOOLS_AVAILABLE}")
    print("Starting server op http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
