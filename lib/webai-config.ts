/** Primary WebAI.js model (falls back to Transformers.js summarizer if this fails). */
export const WEBAI_SESSION_MODEL_ID = "llama-3.2-1b-instruct";

/** Smaller WebAI model — swap in webai-config if the 1B build fails on your device. */
export const WEBAI_SESSION_MODEL_ID_SMALL = "smollm2-360m-instruct";
