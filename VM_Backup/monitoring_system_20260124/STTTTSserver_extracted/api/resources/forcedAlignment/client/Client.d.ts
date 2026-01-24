import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace ForcedAlignment {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ForcedAlignment {
    protected readonly _options: ForcedAlignment.Options;
    constructor(_options?: ForcedAlignment.Options);
    /**
     * Force align an audio file to text. Use this endpoint to get the timing information for each character and word in an audio file based on a provided text transcript.
     *
     * @param {ElevenLabs.BodyCreateForcedAlignmentV1ForcedAlignmentPost} request
     * @param {ForcedAlignment.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.forcedAlignment.create({
     *         file: fs.createReadStream("/path/to/your/file"),
     *         text: "text"
     *     })
     */
    create(request: ElevenLabs.BodyCreateForcedAlignmentV1ForcedAlignmentPost, requestOptions?: ForcedAlignment.RequestOptions): core.HttpResponsePromise<ElevenLabs.ForcedAlignmentResponseModel>;
    private __create;
}
