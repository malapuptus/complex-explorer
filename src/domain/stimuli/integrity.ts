/**
 * Stimulus pack integrity — SHA-256 hashes of word lists.
 * If any word changes, the hash changes and tests fail.
 * Pure domain — uses SubtleCrypto (available in browsers + Node 18+).
 */

/** Expected SHA-256 hashes keyed by `${id}@${version}`. */
export const EXPECTED_HASHES: Readonly<Record<string, string>> = {
  "demo-10@1.0.0": "703387c3dee2fc429df5b478e20916e77e15cb949ea31a2fb1d6067eb8714201",
  "kent-rosanoff-1910@1.0.0": "31ab5dd87c812e7204231c8756ed3e2572befdb611a7320aaf601cedfbbbf210",
  // 0281: practice-100 hash — frozen from pack words (95 unique words, joined by "\n")
  "practice-100@1.0.0": "8f1826e7319fe607e7e2f2845ec7c3315f5db11ddcb9bdd8c774734e7c2febd6",
};

/**
 * Compute SHA-256 hex digest of `words.join("\n")`.
 */
export async function computeWordsSha256(words: readonly string[]): Promise<string> {
  const payload = new TextEncoder().encode(words.join("\n"));
  const buf = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
