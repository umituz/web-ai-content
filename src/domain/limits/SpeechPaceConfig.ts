/**
 * Speech Pace Configuration
 * Constants used to convert between human time and LLM token budgets
 * (words per second for video/voice scripts, tokens per second for AI budgets).
 */

export const SpeechPaceConfig = {
  /**
   * Average spoken words per second. Used to estimate script length
   * from a target video duration.
   */
  WORDS_PER_SECOND: 2.5,

  /**
   * Approximate tokens per second of generated speech. Used to size
   * max_tokens so a model isn't truncated mid-script.
   */
  TOKENS_PER_SECOND: 10,

  /**
   * Flat tokens added to every JSON-shaped budget. Covers the JSON
   * scaffolding (field names, arrays, quotes) and reasoning-model
   * thinking tokens, which are billed from the same completion budget
   * — without this floor short scripts truncate mid-JSON and the
   * parser silently falls back to defaults.
   */
  JSON_TOKEN_OVERHEAD: 500,

  /**
   * Content calendar entries scale their token budget linearly with
   * the number of days requested.
   */
  TOKENS_PER_CALENDAR_DAY: 100,
} as const;
