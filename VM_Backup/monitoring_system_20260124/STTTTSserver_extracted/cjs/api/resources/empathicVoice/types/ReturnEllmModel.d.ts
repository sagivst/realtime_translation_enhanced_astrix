/**
 * A specific eLLM Model configuration
 */
export interface ReturnEllmModel {
    /**
     * Boolean indicating if the eLLM is allowed to generate short responses.
     *
     * If omitted, short responses from the eLLM are enabled by default.
     */
    allowShortResponses: boolean;
}
