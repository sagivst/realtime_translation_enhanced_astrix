import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
import { Document } from "../resources/document/client/Client";
import { Documents } from "../resources/documents/client/Client";
export declare namespace KnowledgeBase {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class KnowledgeBase {
    protected readonly _options: KnowledgeBase.Options;
    protected _documents: Documents | undefined;
    protected _document: Document | undefined;
    constructor(_options?: KnowledgeBase.Options);
    get documents(): Documents;
    get document(): Document;
    /**
     * Get a list of available knowledge base documents
     *
     * @param {ElevenLabs.conversationalAi.KnowledgeBaseListRequest} request
     * @param {KnowledgeBase.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.knowledgeBase.list({
     *         pageSize: 1,
     *         search: "search",
     *         showOnlyOwnedDocuments: true,
     *         sortDirection: "asc",
     *         sortBy: "name",
     *         useTypesense: true,
     *         cursor: "cursor"
     *     })
     */
    list(request?: ElevenLabs.conversationalAi.KnowledgeBaseListRequest, requestOptions?: KnowledgeBase.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetKnowledgeBaseListResponseModel>;
    private __list;
}
