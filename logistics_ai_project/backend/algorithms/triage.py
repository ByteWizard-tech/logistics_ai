"""Triage module: QuickSort orders by priority (descending), with weight tie-breaking."""

from __future__ import annotations

import random

from backend.models.schemas import Order


def _sort_key(order: Order) -> tuple[int, float]:
    """
    Sort key: primary = priority descending, secondary = weight descending.

    Heavier orders first on equal priority ensures the knapsack
    packs the most impactful items early.
    """
    return (-order.priority, -order.weight)


def _partition(orders: list[Order], low: int, high: int) -> int:
    """Lomuto partition scheme using composite sort key."""
    pivot_key = _sort_key(orders[high])
    i = low - 1
    for j in range(low, high):
        if _sort_key(orders[j]) <= pivot_key:
            i += 1
            orders[i], orders[j] = orders[j], orders[i]
    orders[i + 1], orders[high] = orders[high], orders[i + 1]
    return i + 1


def _quicksort_iterative(orders: list[Order], low: int, high: int) -> None:
    """
    Iterative quicksort — avoids stack overflow on large inputs.

    Uses an explicit stack instead of recursion, with randomised pivot
    selection to avoid O(n²) worst-case.
    """
    stack: list[tuple[int, int]] = [(low, high)]

    while stack:
        lo, hi = stack.pop()
        if lo >= hi:
            continue

        # Random pivot to avoid worst-case
        rand_idx = random.randint(lo, hi)
        orders[rand_idx], orders[hi] = orders[hi], orders[rand_idx]

        pi = _partition(orders, lo, hi)

        # Push smaller partition first (tail-call optimisation)
        if pi - lo < hi - pi:
            stack.append((pi + 1, hi))
            stack.append((lo, pi - 1))
        else:
            stack.append((lo, pi - 1))
            stack.append((pi + 1, hi))


def sort_orders_by_priority(orders: list[Order]) -> list[Order]:
    """
    Sort orders by priority in descending order using QuickSort.

    Tie-breaking: on equal priority, heavier orders come first.
    Returns a new sorted list — the original is never modified.
    Handles empty or single-element lists gracefully.
    """
    if not orders:
        return []

    # Validate priorities
    for o in orders:
        if not isinstance(o.priority, int) or o.priority < 1:
            raise ValueError(
                f"Order {o.id} has invalid priority: {o.priority} "
                "(must be a positive integer)"
            )

    sorted_orders = list(orders)  # Shallow copy
    if len(sorted_orders) > 1:
        _quicksort_iterative(sorted_orders, 0, len(sorted_orders) - 1)
    return sorted_orders
