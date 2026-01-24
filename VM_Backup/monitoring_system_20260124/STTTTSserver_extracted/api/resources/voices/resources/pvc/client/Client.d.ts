import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
import { Samples } from "../resources/samples/client/Client";
import { Verification } from "../resources/verification/client/Client";
export declare namespace Pvc {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Pvc {
    protected readonly _options: Pvc.Options;
    protected _samples: Samples | undefined;
    protected _verification: Verification | undefined;
    constructor(_options?: Pvc.Options);
    get samples(): Samples;
    get verification(): Verification;
    /**
     * Creates a new PVC voice with metadata but no samples
     *
     * @param {ElevenLabs.voices.CreatePvcVoiceRequest} request
     * @param {Pvc.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.create({
     *         name: "John Smith",
     *         language: "en"
     *     })
     */
    create(request: ElevenLabs.voices.CreatePvcVoiceRequest, requestOptions?: Pvc.RequestOptions): core.HttpResponsePromise<ElevenLabs.AddVoiceResponseModel>;
    private __create;
    /**
     * Edit PVC voice metadata
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {ElevenLabs.voices.BodyEditPvcVoiceV1VoicesPvcVoiceIdPost} request
     * @param {Pvc.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.update("21m00Tcm4TlvDq8ikWAM")
     */
    update(voice_id: string, request?: ElevenLabs.voices.BodyEditPvcVoiceV1VoicesPvcVoiceIdPost, requestOptions?: Pvc.RequestOptions): core.HttpResponsePromise<ElevenLabs.AddVoiceResponseModel>;
    private __update;
    /**
     * Start PVC training process for a voice.
     *
     * @param {string} voice_id - Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.
     * @param {ElevenLabs.voices.BodyRunPvcTrainingV1VoicesPvcVoiceIdTrainPost} request
     * @param {Pvc.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.voices.pvc.train("21m00Tcm4TlvDq8ikWAM")
     */
    train(voice_id: string, request?: ElevenLabs.voices.BodyRunPvcTrainingV1VoicesPvcVoiceIdTrainPost, requestOptions?: Pvc.RequestOptions): core.HttpResponsePromise<ElevenLabs.StartPvcVoiceTrainingResponseModel>;
    private __train;
}
