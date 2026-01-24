import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace Content {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Content {
    protected readonly _options: Content.Options;
    constructor(_options?: Content.Options);
    /**
     * Updates Studio project content.
     *
     * @param {string} project_id
     * @param {ElevenLabs.studio.projects.BodyUpdateStudioProjectContentV1StudioProjectsProjectIdContentPost} request
     * @param {Content.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.studio.projects.content.update("21m00Tcm4TlvDq8ikWAM", {})
     */
    update(project_id: string, request: ElevenLabs.studio.projects.BodyUpdateStudioProjectContentV1StudioProjectsProjectIdContentPost, requestOptions?: Content.RequestOptions): core.HttpResponsePromise<ElevenLabs.EditProjectResponseModel>;
    private __update;
}
