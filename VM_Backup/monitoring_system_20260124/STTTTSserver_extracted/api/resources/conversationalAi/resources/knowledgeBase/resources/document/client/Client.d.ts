import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace Document {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Document {
    protected readonly _options: Document.Options;
    constructor(_options?: Document.Options);
    /**
     * In case the document is not RAG indexed, it triggers rag indexing task, otherwise it just returns the current status.
     *
     * @param {string} documentation_id - The id of a document from the knowledge base. This is returned on document addition.
     * @param {ElevenLabs.conversationalAi.knowledgeBase.RagIndexRequestModel} request
     * @param {Document.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.knowledgeBase.document.computeRagIndex("21m00Tcm4TlvDq8ikWAM", {
     *         model: "e5_mistral_7b_instruct"
     *     })
     */
    computeRagIndex(documentation_id: string, request: ElevenLabs.conversationalAi.knowledgeBase.RagIndexRequestModel, requestOptions?: Document.RequestOptions): core.HttpResponsePromise<ElevenLabs.RagDocumentIndexResponseModel>;
    private __computeRagIndex;
}
