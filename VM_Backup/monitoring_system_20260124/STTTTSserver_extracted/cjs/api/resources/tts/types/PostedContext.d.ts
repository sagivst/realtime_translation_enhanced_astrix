import type * as Hume from "../../../index.js";
/**
 * Utterances to use as context for generating consistent speech style and prosody across multiple requests. These will not be converted to speech output.
 */
export type PostedContext = Hume.tts.PostedContextWithGenerationId | Hume.tts.PostedContextWithUtterances;
