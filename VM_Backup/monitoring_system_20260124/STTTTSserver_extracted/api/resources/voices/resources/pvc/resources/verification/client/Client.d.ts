import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
import { Captcha } from "../resources/captcha/client/Client";
export declare namespace Verification {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Verification {
    protected readonly _options: Verification.Options;
    protected _captcha: Captcha | undefined;
    constructor(_options?: Verification.Options);
    get captcha(): Captcha;
    /**
     * Request manual verification for a PVC voice.
     *
     * @param {string} voice_id
     * @param {ElevenLabs.voices.pvc.BodyRequestManualVerificationV1VoicesPvcVoiceIdVerificationPost} request
     * @param {Verification.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.voices.pvc.verification.request("21m00Tcm4TlvDq8ikWAM", {
     *         files: [fs.createReadStream("/path/to/your/file")]
     *     })
     */
    request(voice_id: string, request: ElevenLabs.voices.pvc.BodyRequestManualVerificationV1VoicesPvcVoiceIdVerificationPost, requestOptions?: Verification.RequestOptions): core.HttpResponsePromise<ElevenLabs.RequestPvcManualVerificationResponseModel>;
    private __request;
}
