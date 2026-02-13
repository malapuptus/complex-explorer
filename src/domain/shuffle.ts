/**
 * Deterministic seeded shuffle using a simple mulberry32 PRNG.
 * Pure function — same seed always produces the same permutation.
 *
 * Algorithm: Fisher–Yates shuffle with mulberry32 as the RNG.
 * Mulberry32 is a 32-bit state PRNG with good statistical properties
 * for non-cryptographic use.
 */

/**
 * Mulberry32 PRNG — returns a function that yields [0, 1) on each call.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle an array deterministically using a numeric seed.
 * Returns a new array; does not mutate the input.
 *
 * @param items - The array to shuffle.
 * @param seed - Integer seed for reproducibility.
 * @returns A new shuffled array.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const rng = mulberry32(seed);

  // Fisher–Yates (Durstenfeld) shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }

  return result;
}

/**
 * Generate a random seed from Math.random().
 * Not cryptographically secure — used only for shuffle seeding.
 */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}
