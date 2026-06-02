/**
 * Branded type utility for nominal typing at zero runtime cost.
 * Prevents accidental swaps between structurally identical IDs.
 */
export type Brand<K, T> = K & { __brand: T }
