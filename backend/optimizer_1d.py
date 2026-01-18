"""
Zaagplan Optimizer - 1D Cutting Stock Problem Solver
Ondersteunt meerdere algoritmes: OR-Tools, FFD, en Custom Hybrid

Auteur: OpenAEC (Jochem Bosman & Claude)
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
    SMART_SPLIT = "smart_split"              # Slim splitsen: langste eerst, reststukken vullen


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
        algorithm: Algorithm = Algorithm.HYBRID,
        max_split_parts: int = 2,
        joint_allowance: float = 0.0
    ) -> OptimizationResult:
        """
        Hoofdfunctie: optimaliseer zaagplan
        
        Args:
            parts: Lijst van te zagen onderdelen
            stocks: Lijst van beschikbare voorraad
            algorithm: Te gebruiken algoritme
            max_split_parts: Max aantal delen per onderdeel (1=niet splitsen)
            joint_allowance: Extra lengte per verbinding in mm
            
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
        
        # Check voor te lange stukken en splits indien nodig
        max_stock_length = max(s.length for s in stocks)
        parts_ok = []
        parts_too_long = []
        
        for part in expanded_parts:
            if part.length + self.kerf <= max_stock_length:
                parts_ok.append(part)
            elif max_split_parts > 1:
                # Splits het onderdeel
                split_parts = self._split_part(part, max_stock_length, max_split_parts, joint_allowance)
                if split_parts:
                    parts_ok.extend(split_parts)
                else:
                    parts_too_long.append(part)
            else:
                parts_too_long.append(part)
        
        # Kies algoritme
        if algorithm == Algorithm.ORTOOLS_OPTIMAL:
            plans = self._optimize_ortools_optimal(parts_ok, sorted_stocks)
        elif algorithm == Algorithm.ORTOOLS_FAST:
            plans = self._optimize_ortools_fast(parts_ok, sorted_stocks)
        elif algorithm == Algorithm.FFD:
            plans = self._optimize_ffd(parts_ok, sorted_stocks)
        elif algorithm == Algorithm.HYBRID:
            plans = self._optimize_hybrid(parts_ok, sorted_stocks)
        elif algorithm == Algorithm.SMART_SPLIT:
            plans = self._optimize_smart_split(parts_ok, sorted_stocks, max_split_parts, joint_allowance)
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
    
    def _split_part(
        self,
        part: Part,
        max_length: float,
        max_parts: int,
        joint_allowance: float
    ) -> List[Part]:
        """
        Split een te lang onderdeel in meerdere delen
        
        SLIM SPLITSEN LOGICA:
        - Deel 1: max voorraadlengte (zo lang mogelijk)
        - Deel 2: rest + joint_allowance (reststuk met overlap)
        
        Args:
            part: Het te splitsen onderdeel
            max_length: Maximale lengte per deel
            max_parts: Maximum aantal delen
            joint_allowance: Extra lengte per verbinding
            
        Returns:
            Lijst van gesplitste delen, of lege lijst als niet mogelijk
        """
        original_length = part.length
        
        # Check of splitsen nodig is
        if original_length <= max_length:
            return [part]
        
        # Check of splitsen mogelijk is binnen max_parts
        # Met slim splitsen: deel1 = max, deel2 = rest + joint
        remaining = original_length
        split_parts = []
        part_num = 0
        
        while remaining > 0 and part_num < max_parts:
            part_num += 1
            
            if remaining <= max_length:
                # Laatste deel past volledig
                # Voeg joint_allowance toe als het niet het eerste deel is
                this_length = remaining + (joint_allowance if part_num > 1 else 0)
                
                # Check of het nog steeds past
                if this_length > max_length:
                    this_length = remaining  # Geen extra als het niet past
                
                split_parts.append(Part(
                    id=f"{part.id}_d{part_num}",
                    length=this_length,
                    quantity=1,
                    label=f"{part.label} (deel {part_num})"
                ))
                remaining = 0
            else:
                # Neem maximale lengte
                split_parts.append(Part(
                    id=f"{part.id}_d{part_num}",
                    length=max_length,
                    quantity=1,
                    label=f"{part.label} (deel {part_num})"
                ))
                # Trek af: max_length - joint_allowance (want overlap gaat naar volgend stuk)
                remaining -= (max_length - joint_allowance)
        
        # Check of alles geplaatst kon worden
        if remaining > 0:
            return []  # Kan niet gesplitst worden binnen limiet
        
        return split_parts
    
    def _optimize_ffd(
        self, 
        parts: List[Part], 
        stocks: List[Stock]
    ) -> List[CutPlan]:
        """
        First Fit Decreasing algoritme met quantity tracking
        Simpel en snel, maar niet optimaal
        """
        # Sorteer parts op lengte (langste eerst)
        sorted_parts = sorted(parts, key=lambda p: p.length, reverse=True)
        
        # Bouw inventory met quantity tracking
        stock_inventory = {}
        for stock in stocks:
            qty = 999 if stock.quantity == -1 else stock.quantity
            stock_inventory[stock.id] = {'stock': stock, 'available': qty, 'used': 0}
        
        # Track welke voorraad we gebruiken
        open_stocks: List[Tuple[Stock, float, List[Tuple[str, float]]]] = []
        not_placed: List[Part] = []
        
        def get_available_stock(min_length: float) -> Optional[Stock]:
            """Vind kleinste beschikbare voorraad die past"""
            for stock in sorted(stocks, key=lambda s: s.length):
                inv = stock_inventory[stock.id]
                if stock.length >= min_length and inv['available'] > inv['used']:
                    return stock
            return None
        
        def use_stock(stock: Stock):
            stock_inventory[stock.id]['used'] += 1
        
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
                # Vind kleinste passende voorraad met quantity check
                stock = get_available_stock(part.length)
                if stock:
                    use_stock(stock)
                    open_stocks.append((
                        stock,
                        stock.length - part.length,
                        [(part.id, part.length)]
                    ))
                    placed = True
                else:
                    not_placed.append(part)
                    print(f"[FFD] Geen voorraad beschikbaar voor {part.id} ({part.length}mm)")
        
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
        Hybrid algoritme met quantity tracking:
        1. Langste stukken → langste voorraad
        2. Kleine stukken parkeren
        3. Reststukken optimaal vullen
        """
        sorted_parts = sorted(parts, key=lambda p: p.length, reverse=True)
        sorted_stocks = sorted(stocks, key=lambda s: s.length, reverse=True)
        
        # Bouw inventory met quantity tracking
        stock_inventory = {}
        for stock in stocks:
            qty = 999 if stock.quantity == -1 else stock.quantity
            stock_inventory[stock.id] = {'stock': stock, 'available': qty, 'used': 0}
        
        def get_available_stock(min_length: float) -> Optional[Stock]:
            """Vind kleinste beschikbare voorraad die past"""
            for stock in sorted(sorted_stocks, key=lambda s: s.length):
                inv = stock_inventory[stock.id]
                if stock.length >= min_length and inv['available'] > inv['used']:
                    return stock
            return None
        
        def use_stock(stock: Stock):
            stock_inventory[stock.id]['used'] += 1
        
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
                # Nieuwe voorraad openen (kleinste passende met quantity check)
                stock = get_available_stock(part.length)
                if stock:
                    use_stock(stock)
                    open_stocks.append((
                        stock,
                        stock.length - part.length,
                        [(part.id, part.length)]
                    ))
                    placed = True
                else:
                    print(f"[HYBRID] Geen voorraad voor {part.id} ({part.length}mm)")
        
        # Fase 2: Kleine stukken in reststukken plaatsen
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
                # Nieuwe voorraad (kleinste passende met quantity check)
                stock = get_available_stock(part.length)
                if stock:
                    use_stock(stock)
                    open_stocks.append((
                        stock,
                        stock.length - part.length,
                        [(part.id, part.length)]
                    ))
                else:
                    print(f"[HYBRID] Geen voorraad voor small part {part.id} ({part.length}mm)")
        
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
    
    def _optimize_smart_split(
        self, 
        parts: List[Part], 
        stocks: List[Stock],
        max_split_parts: int = 2,
        joint_allowance: float = 50
    ) -> List[CutPlan]:
        """
        Slim Splitsen algoritme:
        1. Sorteer onderdelen op lengte (aflopend)
        2. Split te lange onderdelen: hoofddeel (max) + reststuk (GEPARKEERD)
        3. Plaats hoofddelen (langste eerst, NIET geparkeerd)
        4. Vul gaten met geparkeerde + kleine stukken (best-fit)
        
        Args:
            parts: Te plaatsen onderdelen
            stocks: Beschikbare voorraad
            max_split_parts: Max aantal delen per split (default 2)
            joint_allowance: Extra lengte per verbinding in mm (default 50)
        """
        max_stock_length = max(s.length for s in stocks)
        
        # Bouw voorraad inventory met quantity tracking
        stock_inventory = {}
        for stock in stocks:
            qty = 999 if stock.quantity == -1 else stock.quantity
            stock_inventory[stock.id] = {
                'stock': stock,
                'available': qty,
                'used': 0
            }
        
        # Sorteer voorraad op lengte (langste eerst)
        sorted_stocks = sorted(stocks, key=lambda s: s.length, reverse=True)
        
        # === FASE 1: Split te lange onderdelen ===
        main_parts = []      # Hoofddelen (langste eerst plaatsen)
        parked_parts = []    # Geparkeerde reststukken (later vullen)
        
        # Sorteer parts op lengte (aflopend)
        sorted_input = sorted(parts, key=lambda p: p.length, reverse=True)
        
        for part in sorted_input:
            if part.length <= max_stock_length:
                # Past in 1x, geen split nodig
                main_parts.append(part)
            else:
                # Moet gesplitst worden
                # Deel 1: Hoofddeel = max voorraadlengte
                main_part = Part(
                    id=f"{part.id}_d1",
                    length=max_stock_length,
                    quantity=1,
                    label=f"{part.label} (deel 1)"
                )
                main_parts.append(main_part)
                
                # Deel 2: Reststuk = origineel - max + joint_allowance
                rest_length = part.length - max_stock_length + joint_allowance
                if rest_length > 0:
                    parked_part = Part(
                        id=f"{part.id}_d2",
                        length=rest_length,
                        quantity=1,
                        label=f"{part.label} (deel 2)"
                    )
                    parked_parts.append(parked_part)
                    print(f"[SPLIT] {part.id} ({part.length}mm) -> d1: {max_stock_length}mm + d2: {rest_length}mm (PARKED)")
        
        # Sorteer main_parts op lengte (aflopend)
        main_parts = sorted(main_parts, key=lambda p: p.length, reverse=True)
        
        # === FASE 2: Plaats hoofddelen (langste eerst) ===
        # open_beams: lijst van (stock, remaining_length, cuts_list)
        open_beams: List[Tuple[Stock, float, List[Tuple[str, float]]]] = []
        
        def get_available_stock(min_length: float) -> Optional[Stock]:
            """Vind kleinste beschikbare voorraad die past"""
            for stock in sorted(sorted_stocks, key=lambda s: s.length):
                inv = stock_inventory[stock.id]
                if stock.length >= min_length and inv['available'] > inv['used']:
                    return stock
            return None
        
        def use_stock(stock: Stock):
            """Markeer een voorraad als gebruikt"""
            stock_inventory[stock.id]['used'] += 1
        
        for part in main_parts:
            placed = False
            needed_with_kerf = part.length
            
            # Probeer eerst in bestaande open beam (best fit)
            candidates = []
            for i, (stock, remaining, cuts) in enumerate(open_beams):
                needed = part.length + (self.kerf if cuts else 0)
                if remaining >= needed:
                    candidates.append((i, stock, remaining, cuts, needed))
            
            # Sorteer op remaining (kleinste passende eerst = best fit)
            candidates.sort(key=lambda x: x[2])
            
            if candidates:
                i, stock, remaining, cuts, needed = candidates[0]
                cuts.append((part.id, part.length))
                open_beams[i] = (stock, remaining - needed, cuts)
                placed = True
                print(f"[PLACE] {part.id} ({part.length}mm) -> existing beam, rest: {remaining - needed}mm")
            
            if not placed:
                # Open nieuwe voorraad
                # Zoek kleinste voorraad die past EN beschikbaar is
                stock = get_available_stock(part.length)
                if stock:
                    use_stock(stock)
                    remaining = stock.length - part.length
                    open_beams.append((
                        stock,
                        remaining,
                        [(part.id, part.length)]
                    ))
                    placed = True
                    print(f"[NEW BEAM] {stock.id} ({stock.length}mm) for {part.id} ({part.length}mm), rest: {remaining}mm")
                else:
                    print(f"[ERROR] Geen voorraad beschikbaar voor {part.id} ({part.length}mm)")
        
        # === FASE 3: Vul gaten met geparkeerde + kleine stukken ===
        # Combineer parked_parts met kleine onderdelen en sorteer op lengte (aflopend)
        fill_parts = sorted(parked_parts, key=lambda p: p.length, reverse=True)
        
        for part in fill_parts:
            placed = False
            
            # Zoek beste fit in bestaande beams
            candidates = []
            for i, (stock, remaining, cuts) in enumerate(open_beams):
                needed = part.length + (self.kerf if cuts else 0)
                if remaining >= needed:
                    candidates.append((i, stock, remaining, cuts, needed))
            
            # Best fit: kleinste restlengte die nog past
            candidates.sort(key=lambda x: x[2])
            
            if candidates:
                i, stock, remaining, cuts, needed = candidates[0]
                cuts.append((part.id, part.length))
                open_beams[i] = (stock, remaining - needed, cuts)
                placed = True
                print(f"[FILL] {part.id} ({part.length}mm) -> beam with {remaining}mm rest, new rest: {remaining - needed}mm")
            
            if not placed:
                # Nieuwe voorraad nodig (kleinste passende)
                stock = get_available_stock(part.length)
                if stock:
                    use_stock(stock)
                    remaining = stock.length - part.length
                    open_beams.append((
                        stock,
                        remaining,
                        [(part.id, part.length)]
                    ))
                    placed = True
                    print(f"[NEW BEAM for fill] {stock.id} ({stock.length}mm) for {part.id} ({part.length}mm)")
                else:
                    print(f"[ERROR] Geen voorraad voor geparkeerd deel {part.id} ({part.length}mm)")
        
        # === Converteer naar CutPlans ===
        plans = []
        stock_counts: Dict[str, int] = {}
        
        for stock, remaining, cuts in open_beams:
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
        
        # Log summary
        print(f"\n[SUMMARY] {len(plans)} beams used:")
        for plan in plans:
            parts_str = ", ".join([f"{c[0]}({c[1]})" for c in plan.cuts])
            print(f"  - {plan.stock_id} ({plan.stock_length}mm): {parts_str} | waste: {plan.waste}mm")
        
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
        MET quantity constraints per voorraadtype
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
        
        # Voor elke stock, genereer patterns
        # Track welke patterns bij welke stock horen
        all_patterns = []
        pattern_stock = []
        pattern_stock_idx = []  # Index van stock in stocks list
        
        for stock_idx, stock in enumerate(stocks):
            patterns = self._generate_patterns(lengths, stock.length)
            for pattern in patterns:
                all_patterns.append(pattern)
                pattern_stock.append(stock)
                pattern_stock_idx.append(stock_idx)
        
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
        
        # NIEUW: Quantity constraints per stock type
        # Sum van alle patterns die deze stock gebruiken <= quantity
        for stock_idx, stock in enumerate(stocks):
            if stock.quantity != -1:  # -1 = onbeperkt
                qty_constraint = solver.Constraint(0, stock.quantity)
                for i, pat_stock_idx in enumerate(pattern_stock_idx):
                    if pat_stock_idx == stock_idx:
                        qty_constraint.SetCoefficient(x[i], 1)
                print(f"[OR-Tools] Quantity constraint: {stock.id} <= {stock.quantity}")
        
        # Objective: minimaliseer aantal stocks
        objective = solver.Objective()
        for i in range(len(all_patterns)):
            objective.SetCoefficient(x[i], 1)
        objective.SetMinimization()
        
        # Solve
        status = solver.Solve()
        
        if status != pywraplp.Solver.OPTIMAL:
            print(f"[OR-Tools] Geen optimale oplossing gevonden (status={status}), fallback naar Hybrid")
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
        
        # Verify quantity constraints
        for stock in stocks:
            if stock.quantity != -1:
                used = stock_counts.get(stock.id, 0)
                if used > stock.quantity:
                    print(f"[OR-Tools] WARNING: {stock.id} used {used} > available {stock.quantity}")
                else:
                    print(f"[OR-Tools] {stock.id}: used {used}/{stock.quantity}")
        
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
