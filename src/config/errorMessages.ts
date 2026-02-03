/**
 * Centralized error messages configuration
 * Edit this file to customize all user-facing error messages
 */

export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH: {
    NOT_LOGGED_IN: "Sorry: You must be logged in to perform this action.",
    SIGN_IN_FAILED: "Unable to sign in. Please try again.",
    SIGN_OUT_FAILED: "Unable to sign out. Please try again.",
    SESSION_EXPIRED: "Your session has expired. Please sign in again.",
    LINK_FAILED: "Unable to link your account. Please try again.",
    ACCOUNT_EXISTS: "This Google account is already registered. Would you like to sign in instead?",
  },

  // Knowledge/Resource errors
  KNOWLEDGE: {
    LOAD_FAILED: "Could not load knowledge base. Please refresh the page.",
    NO_SOURCES_SELECTED: "Please select at least one knowledge source.",
  },

  // Generation/AI errors
  GENERATION: {
    FAILED: "Something went wrong. Please try again.",
    API_ERROR: (message: string) => `API error: ${message}`,
    TIMEOUT: "The request timed out. Please try again.",
    RATE_LIMITED: "I'm a bit busy right now. Please try again in a few seconds.",
  },

  // Save/Output errors
  SAVE: {
    FAILED: "Could not save output. Please try again.",
    LOAD_OUTPUTS_FAILED: "Could not load your saved outputs.",
  },

  // Chat history errors
  HISTORY: {
    LOAD_FAILED: "Could not load chat history.",
  },

  // Query validation errors
  VALIDATION: {
    EMPTY_QUERY: "Please enter a question to get started.",
    TOO_SHORT: "Please enter a complete question.",
    GREETING_DETECTED: "I'm ready to help! What would you like to know about digital health technologies?",
    GIBBERISH_DETECTED: "I didn't understand that. Please ask a question about digital health technologies.",
    SPECIAL_CHARS_ONLY: "Please ask a question in plain English.",
    TOO_VAGUE: "Please be more specific about what aspect you'd like to know.",
  },

  // Generic errors
  GENERIC: {
    UNEXPECTED: "An unexpected error occurred. Please try again.",
    NETWORK: "Network error. Please check your connection.",
  },
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  SAVE: {
    OUTPUT_SAVED: "Output saved successfully!",
  },
} as const;

/**
 * Warning messages
 */
export const WARNING_MESSAGES = {
  AUTH: {
    LOGIN_REQUIRED: "Please sign in to use this feature.",
  },
  KNOWLEDGE: {
    SELECT_SOURCES: "Please select at least one knowledge source.",
  },
} as const;

/**
 * Prompt messages for sign-in prompts
 */
export const PROMPT_MESSAGES = {
  AUTH: {
    SIGN_IN_BENEFIT: "Sign in or create an account to save your conversations and bookmarks across devices",
    SIGN_IN_CTA: "Sign in with Google",
    MAYBE_LATER: "Maybe later",
  },
} as const;
