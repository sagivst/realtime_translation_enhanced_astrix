import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace Ivc {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Ivc {
    protected readonly _options: Ivc.Options;
    constructor(_options?: Ivc.Options);
    /**
     * Create a voice clone and add it to your Voices
     *
     * @param {ElevenLabs.voices.BodyAddVoiceV1VoicesAddPost} request
     * @param {Ivc.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.voices.ivc.create({
     *         files: [fs.createReadStream("/path/to/your/file")],
     *         name: "name"
     *     })
     */
    create(request: ElevenLabs.voices.BodyAddVoiceV1VoicesAddPost, requestOptions?: Ivc.RequestOptions): core.HttpResponsePromise<ElevenLabs.AddVoiceIvcResponseModel>;
    private __create;
}
