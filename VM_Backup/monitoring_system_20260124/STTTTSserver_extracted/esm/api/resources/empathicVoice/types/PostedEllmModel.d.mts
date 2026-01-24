/**
 * A eLLM model configuration to be posted to the server
 */
export interface PostedEllmModel {
    /**
     * Boolean indicating if the eLLM is allowed to generate short responses.
     *
     * If omitted, short responses from the eLLM are enabled by default.
     */
    allowShortResponses?: boolean;
}
