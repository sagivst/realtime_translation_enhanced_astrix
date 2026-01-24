import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
import { Audio } from "../resources/audio/client/Client";
import { Resource } from "../resources/resource/client/Client";
import { Transcript } from "../resources/transcript/client/Client";
export declare namespace Dubbing {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Dubbing {
    protected readonly _options: Dubbing.Options;
    protected _resource: Resource | undefined;
    protected _audio: Audio | undefined;
    protected _transcript: Transcript | undefined;
    constructor(_options?: Dubbing.Options);
    get resource(): Resource;
    get audio(): Audio;
    get transcript(): Transcript;
    /**
     * List the dubs you have access to.
     *
     * @param {ElevenLabs.DubbingListRequest} request
     * @param {Dubbing.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.list({
     *         cursor: "cursor",
     *         pageSize: 1,
     *         dubbingStatus: "dubbing",
     *         filterByCreator: "personal",
     *         orderBy: "created_at",
     *         orderDirection: "DESCENDING"
     *     })
     */
    list(request?: ElevenLabs.DubbingListRequest, requestOptions?: Dubbing.RequestOptions): core.HttpResponsePromise<ElevenLabs.DubbingMetadataPageResponseModel>;
    private __list;
    /**
     * Dubs a provided audio or video file into given language.
     *
     * @param {ElevenLabs.BodyDubAVideoOrAnAudioFileV1DubbingPost} request
     * @param {Dubbing.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.dubbing.create({})
     */
    create(request: ElevenLabs.BodyDubAVideoOrAnAudioFileV1DubbingPost, requestOptions?: Dubbing.RequestOptions): core.HttpResponsePromise<ElevenLabs.DoDubbingResponse>;
    private __create;
    /**
     * Returns metadata about a dubbing project, including whether it's still in progress or not
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {Dubbing.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.get("dubbing_id")
     */
    get(dubbing_id: string, requestOptions?: Dubbing.RequestOptions): core.HttpResponsePromise<ElevenLabs.DubbingMetadataResponse>;
    private __get;
    /**
     * Deletes a dubbing project.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {Dubbing.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.delete("dubbing_id")
     */
    delete(dubbing_id: string, requestOptions?: Dubbing.RequestOptions): core.HttpResponsePromise<ElevenLabs.DeleteDubbingResponseModel>;
    private __delete;
}
