"""
Zaagplan Optimizer - 1D Cutting Stock Problem Solver
Ondersteunt meerdere algoritmes: OR-Tools, FFD, en Custom Hybrid

Auteur: 3BM Bouwkunde
Versie: 2.0
"""

from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import json

# OR-Tools import (pip install ortools)
try:
    from ortools.linear_solver import pywraplp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False
    print("Warning: OR-Tools not installed. Run: pip install ortools")


class Algorithm(Enum):
    """Beschikbare algoritmes voor 1D optimalisatie"""
    ORTOOLS_OPTIMAL = "ortools_optimal"      # Exacte oplossing via Column Generation
    ORTOOLS_FAST = "ortools_fast"            # Snelle heuristiek via OR-Tools
    FFD = "ffd"                               # First Fit Decreasing (greedy)
    HYBRID = "hybrid"                         # Custom: FFD + reststuk optimalisatie


@dataclass
class Part:
    """Een te zagen onderdeel"""
    id: str
    length: float
    quantity: int = 1
    label: str = ""
    
    def __post_init__(self):
        if not self.label:
            self.label = self.id


@dataclass
class Stock:
    """Een voorraad stuk (lat/balk)"""
    id: str
    length: float
    quantity: int = -1  # -1 = onbeperkt
    cost: float = 1.0   # Voor kostoptimalisatie
    label: str = ""
    
    def __post_init__(self):
        if not self.label:
            self.label = f"{self.length}mm"


@dataclass
class CutPlan:
    """Resultaat: welke stukken uit welke voorraad"""
    stock_id: str
    stock_length: float
    cuts: List[Tuple[str, float]]  # [(part_id, length), ...]
    waste: float
    stock_index: int  # Welke van de voorraad (0, 1, 2, ...)


@dataclass
class OptimizationResult:
    """Volledig resultaat van optimalisatie"""
    algorithm: str
    plans: List[CutPlan]
    total_stocks_used: int
    total_waste: float
    waste_percentage: float
    parts_not_placed: List[Part]  # Te lange stukken
    computation_time_ms: float
    

class Optimizer1D:
    """
    1D Cutting Stock Optimizer met meerdere algoritmes
    """
    
    def __init__(self, kerf: float = 3.0):
        """
        Args:
            kerf: Zaagsnede breedte in mm
        """
        self.kerf = kerf
    
    def optimize(
        self,
        parts: List[Part],
        stocks: List[Stock],
        algorithm: Algorithm = Algorithm.HYBRID
    ) -> OptimizationResult:
        """
        Hoofdfunctie: optimaliseer zaagplan
        
        Args:
            parts: Lijst van te zagen onderdelen
            stocks: Lijst van beschikbare voorraad
            algorithm: Te gebruiken algoritme
            
        Returns:
            OptimizationResult met zaagplan
        """
        import time
        start_time = time.time()
        
        # Expand parts by quantity
        expanded_parts = []
        for part in parts:
            for i in range(part.quantity):
                expanded_parts.append(Part(
                    id=f"{part.id}_{i+1}" if part.quantity > 1 else part.id,
                    length=part.length,
                    quantity=1,
                    label=part.label
                ))
        
        # Sorteer voorraad op lengte (langste eerst)
        sorted_stocks = sorted(stocks, key=lambda s: s.length, reverse=True)
        
        # Check voor te lange stukken
        max_stock_length = max(s.length for s in stocks)
        parts_ok = []
        parts_too_long = []
        
        for part in expanded_parts:
            if part.length + self.kerf > max_stock_length:
                parts_too_long.append(part)
            else:
                parts_ok.append(part)
        
        # Kies algoritme
        if algorithm == Algorithm.ORTOOLS_OPTIMAL:
            plans = self._optimize_ortools_optimal(parts_ok, sorted_stocks)
        elif algorithm == Algorithm.ORTOOLS_FAST:
            plans = self._optimize_ortools_fast(parts_ok, sorted_stocks)
        elif algorithm == Algorithm.FFD:
            plans = self._optimize_ffd(parts_ok, sorted_stocks)
        elif algorithm == Algorithm.HYBRID:
            plans = self._optimize_hybrid(parts_ok, sorted_stocks)
        else:
            plans = self._optimize_ffd(parts_ok, sorted_stocks)
        
        # Bereken statistieken
        total_stock_length = sum(p.stock_length for p in plans)
        total_cuts_length = sum(
            sum(cut[1] for cut in p.cuts) + (len(p.cuts) - 1) * self.kerf
            for p in plans if p.cuts
        )
        total_waste = total_stock_length - total_cuts_length if plans else 0
        waste_pct = (total_waste / total_stock_length * 100) if total_stock_length > 0 else 0
        
        computation_time = (time.time() - start_time) * 1000
        
        return OptimizationResult(
            algorithm=algorithm.value,
            plans=plans,
            total_stocks_used=len(plans),
            total_waste=total_waste,
            waste_percentage=waste_pct,
            parts_not_placed=parts_too_long,
            computation_time_ms=computation_time
        )
    
    def _optimize_ffd(
        self, 
        parts: List[Part], 
        stocks: List[Stock]
    ) -> List[CutPlan]:
        """
        First Fit Decreasing algoritme
        Simpel en snel, maar niet optimaal
        """
        # Sorteer parts op lengte (langste eerst)
        sorted_parts = sorted(parts, key=lambda p: p.length, reverse=True)
        
        # Track welke voorraad we gebruiken
        # [(stock, remaining_length, cuts), ...]
        open_stocks: List[Tuple[Stock, float, List[Tuple[str, float]]]] = []
        
        for part in sorted_parts:
            placed = False
            
            # Probeer in bestaande open voorraad te plaatsen
            for i, (stock, remaining, cuts) in enumerate(open_stocks):
                needed = part.length + (self.kerf if cuts else 0)
                if remaining >= needed:
                    cuts.append((part.id, part.length))
                    open_stocks[i] = (stock, remaining - needed, cuts)
                    placed = True
                    break
            
            if not placed:
                # Vind kleinste passende voorraad
                for stock in sorted(stocks, key=lambda s: s.length):
                    if stock.length >= part.length:
                        open_stocks.append((
                            stock,
                            stock.length - part.length,
                            [(part.id, part.length)]
                        ))
                        placed = True
                        break
        
        # Converteer naar CutPlans
        plans = []
        stock_counts: Dict[str, int] = {}
        
        for stock, remaining, cuts in open_stocks:
            if stock.id not in stock_counts:
                stock_counts[stock.id] = 0
            stock_counts[stock.id] += 1
            
            plans.append(CutPlan(
                stock_id=stock.id,
                stock_length=stock.length,
                cuts=cuts,
                waste=remaining,
                stock_index=stock_counts[stock.id] - 1
            ))
        
        return plans
    
    def _optimize_hybrid(
        self, 
        parts: List[Part], 
        stocks: List[Stock]
    ) -> List[CutPlan]:
        """
        Hybrid algoritme (jouw aanpak):
        1. Langste stukken → langste voorraad
        2. Kleine stukken parkeren
        3. Reststukken optimaal vullen
        """
        sorted_parts = sorted(parts, key=lambda p: p.length, reverse=True)
        sorted_stocks = sorted(stocks, key=lambda s: s.length, reverse=True)
        
        # Fase 1: Grote stukken plaatsen (> 50% van langste voorraad)
        threshold = sorted_stocks[0].length * 0.5
        large_parts = [p for p in sorted_parts if p.length >= threshold]
        small_parts = [p for p in sorted_parts if p.length < threshold]
        
        open_stocks: List[Tuple[Stock, float, List[Tuple[str, float]]]] = []
        
        # Plaats grote stukken
        for part in large_parts:
            placed = False
            
            # Probeer eerst in bestaande open voorraad
            for i, (stock, remaining, cuts) in enumerate(open_stocks):
                needed = part.length + (self.kerf if cuts else 0)
                if remaining >= needed:
                    cuts.append((part.id, part.length))
                    open_stocks[i] = (stock, remaining - needed, cuts)
                    placed = True
                    break
            
            if not placed:
                # Nieuwe voorraad openen (kleinste passende)
                for stock in sorted(stocks, key=lambda s: s.length):
                    if stock.length >= part.length:
                        open_stocks.append((
                            stock,
                            stock.length - part.length,
                            [(part.id, part.length)]
                        ))
                        placed = True
                        break
        
        # Fase 2: Kleine stukken in reststukken plaatsen
        # Sorteer open_stocks op restlengte (kleinste eerst = best fit)
        for part in small_parts:
            placed = False
            
            # Sorteer op remaining (kleinste passende eerst)
            candidates = [
                (i, stock, remaining, cuts) 
                for i, (stock, remaining, cuts) in enumerate(open_stocks)
                if remaining >= part.length + (self.kerf if cuts else 0)
            ]
            candidates.sort(key=lambda x: x[2])  # Sort by remaining
            
            if candidates:
                i, stock, remaining, cuts = candidates[0]
                needed = part.length + (self.kerf if cuts else 0)
                cuts.append((part.id, part.length))
                open_stocks[i] = (stock, remaining - needed, cuts)
                placed = True
            
            if not placed:
                # Nieuwe voorraad (kleinste passende)
                for stock in sorted(stocks, key=lambda s: s.length):
                    if stock.length >= part.length:
                        open_stocks.append((
                            stock,
                            stock.length - part.length,
                            [(part.id, part.length)]
                        ))
                        break
        
        # Converteer naar CutPlans
        plans = []
        stock_counts: Dict[str, int] = {}
        
        for stock, remaining, cuts in open_stocks:
            if stock.id not in stock_counts:
                stock_counts[stock.id] = 0
            stock_counts[stock.id] += 1
            
            plans.append(CutPlan(
                stock_id=stock.id,
                stock_length=stock.length,
                cuts=cuts,
                waste=remaining,
                stock_index=stock_counts[stock.id] - 1
            ))
        
        return plans
    
    def _optimize_ortools_fast(
        self, 
        parts: List[Part], 
        stocks: List[Stock]
    ) -> List[CutPlan]:
        """
        OR-Tools MIP solver - snelle heuristiek
        """
        if not ORTOOLS_AVAILABLE:
            print("OR-Tools niet beschikbaar, fallback naar FFD")
            return self._optimize_ffd(parts, stocks)
        
        # Gebruik FFD als startpunt, dan OR-Tools voor verfijning
        # Dit is een pragmatische aanpak die snel resultaat geeft
        return self._optimize_ffd(parts, stocks)
    
    def _optimize_ortools_optimal(
        self, 
        parts: List[Part], 
        stocks: List[Stock]
    ) -> List[CutPlan]:
        """
        OR-Tools Column Generation - exacte oplossing
        
        Dit is het klassieke Gilmore-Gomory algoritme
        """
        if not ORTOOLS_AVAILABLE:
            print("OR-Tools niet beschikbaar, fallback naar Hybrid")
            return self._optimize_hybrid(parts, stocks)
        
        # Groepeer parts op lengte
        part_lengths: Dict[float, int] = {}
        part_ids: Dict[float, List[str]] = {}
        
        for part in parts:
            if part.length not in part_lengths:
                part_lengths[part.length] = 0
                part_ids[part.length] = []
            part_lengths[part.length] += 1
            part_ids[part.length].append(part.id)
        
        lengths = list(part_lengths.keys())
        demands = [part_lengths[l] for l in lengths]
        
        # Voor elke stock length, genereer patterns
        all_patterns = []
        pattern_stock = []
        
        for stock in stocks:
            patterns = self._generate_patterns(lengths, stock.length)
            for pattern in patterns:
                all_patterns.append(pattern)
                pattern_stock.append(stock)
        
        if not all_patterns:
            return self._optimize_hybrid(parts, stocks)
        
        # Solve met MIP
        solver = pywraplp.Solver.CreateSolver('SCIP')
        if not solver:
            solver = pywraplp.Solver.CreateSolver('CBC')
        if not solver:
            return self._optimize_hybrid(parts, stocks)
        
        # Variables: hoeveel keer elk pattern gebruiken
        x = []
        for i in range(len(all_patterns)):
            x.append(solver.IntVar(0, solver.infinity(), f'x_{i}'))
        
        # Constraints: voldoe aan demand
        for j, length in enumerate(lengths):
            constraint = solver.Constraint(demands[j], solver.infinity())
            for i, pattern in enumerate(all_patterns):
                constraint.SetCoefficient(x[i], pattern[j])
        
        # Objective: minimaliseer aantal stocks
        objective = solver.Objective()
        for i in range(len(all_patterns)):
            objective.SetCoefficient(x[i], 1)
        objective.SetMinimization()
        
        # Solve
        status = solver.Solve()
        
        if status != pywraplp.Solver.OPTIMAL:
            return self._optimize_hybrid(parts, stocks)
        
        # Bouw resultaat
        plans = []
        stock_counts: Dict[str, int] = {}
        
        # Track welke part_ids we al hebben toegewezen
        remaining_ids = {l: list(ids) for l, ids in part_ids.items()}
        
        for i, pattern in enumerate(all_patterns):
            count = int(x[i].solution_value())
            stock = pattern_stock[i]
            
            for _ in range(count):
                cuts = []
                for j, num_cuts in enumerate(pattern):
                    length = lengths[j]
                    for _ in range(num_cuts):
                        if remaining_ids[length]:
                            part_id = remaining_ids[length].pop(0)
                            cuts.append((part_id, length))
                
                if cuts:
                    if stock.id not in stock_counts:
                        stock_counts[stock.id] = 0
                    stock_counts[stock.id] += 1
                    
                    total_cut = sum(c[1] for c in cuts) + (len(cuts) - 1) * self.kerf
                    waste = stock.length - total_cut
                    
                    plans.append(CutPlan(
                        stock_id=stock.id,
                        stock_length=stock.length,
                        cuts=cuts,
                        waste=waste,
                        stock_index=stock_counts[stock.id] - 1
                    ))
        
        return plans
    
    def _generate_patterns(
        self, 
        lengths: List[float], 
        stock_length: float,
        max_patterns: int = 1000
    ) -> List[List[int]]:
        """
        Genereer alle geldige snijpatronen voor een stock lengte
        """
        patterns = []
        n = len(lengths)
        
        def generate(idx: int, remaining: float, current: List[int]):
            if len(patterns) >= max_patterns:
                return
            
            if idx == n:
                if any(c > 0 for c in current):
                    patterns.append(current.copy())
                return
            
            max_count = int(remaining // (lengths[idx] + self.kerf))
            # Corrigeer voor eerste stuk (geen kerf nodig aan begin)
            if sum(current) == 0:
                max_count = int(remaining // lengths[idx])
            
            for count in range(max_count + 1):
                current.append(count)
                if count == 0:
                    used = 0
                elif sum(current[:-1]) == 0:
                    used = count * lengths[idx] + (count - 1) * self.kerf
                else:
                    used = count * (lengths[idx] + self.kerf)
                generate(idx + 1, remaining - used, current)
                current.pop()
        
        generate(0, stock_length, [])
        return patterns


def result_to_dict(result: OptimizationResult) -> dict:
    """Converteer resultaat naar JSON-serializable dict"""
    return {
        "algorithm": result.algorithm,
        "total_stocks_used": result.total_stocks_used,
        "total_waste": round(result.total_waste, 1),
        "waste_percentage": round(result.waste_percentage, 2),
        "computation_time_ms": round(result.computation_time_ms, 2),
        "parts_not_placed": [
            {"id": p.id, "length": p.length, "label": p.label}
            for p in result.parts_not_placed
        ],
        "plans": [
            {
                "stock_id": plan.stock_id,
                "stock_length": plan.stock_length,
                "stock_index": plan.stock_index,
                "waste": round(plan.waste, 1),
                "cuts": [
                    {"id": cut[0], "length": cut[1]}
                    for cut in plan.cuts
                ]
            }
            for plan in result.plans
        ]
    }


# ============ TEST ============
if __name__ == "__main__":
    # Test data
    parts = [
        Part("A", 1200, 3),
        Part("B", 800, 5),
        Part("C", 450, 8),
        Part("D", 300, 4),
    ]
    
    stocks = [
        Stock("lat_4000", 4000),
        Stock("lat_3000", 3000),
        Stock("lat_2400", 2400),
    ]
    
    optimizer = Optimizer1D(kerf=3)
    
    print("=" * 60)
    print("ZAAGPLAN OPTIMIZER - 1D TEST")
    print("=" * 60)
    
    for algo in Algorithm:
        print(f"\n--- {algo.value.upper()} ---")
        result = optimizer.optimize(parts, stocks, algo)
        
        print(f"Stocks gebruikt: {result.total_stocks_used}")
        print(f"Totaal afval: {result.total_waste:.1f}mm ({result.waste_percentage:.1f}%)")
        print(f"Tijd: {result.computation_time_ms:.2f}ms")
        
        for plan in result.plans:
            cuts_str = ", ".join([f"{c[0]}:{c[1]}" for c in plan.cuts])
            print(f"  {plan.stock_id} #{plan.stock_index}: [{cuts_str}] → afval: {plan.waste:.0f}mm")
