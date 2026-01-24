import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace AudioNative {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class AudioNative {
    protected readonly _options: AudioNative.Options;
    constructor(_options?: AudioNative.Options);
    /**
     * Creates Audio Native enabled project, optionally starts conversion and returns project ID and embeddable HTML snippet.
     *
     * @param {ElevenLabs.BodyCreatesAudioNativeEnabledProjectV1AudioNativePost} request
     * @param {AudioNative.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.audioNative.create({
     *         name: "name"
     *     })
     */
    create(request: ElevenLabs.BodyCreatesAudioNativeEnabledProjectV1AudioNativePost, requestOptions?: AudioNative.RequestOptions): core.HttpResponsePromise<ElevenLabs.AudioNativeCreateProjectResponseModel>;
    private __create;
    /**
     * Get player settings for the specific project.
     *
     * @param {string} project_id - The ID of the Studio project.
     * @param {AudioNative.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.audioNative.getSettings("21m00Tcm4TlvDq8ikWAM")
     */
    getSettings(project_id: string, requestOptions?: AudioNative.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetAudioNativeProjectSettingsResponseModel>;
    private __getSettings;
    /**
     * Updates content for the specific AudioNative Project.
     *
     * @param {string} project_id
     * @param {ElevenLabs.BodyUpdateAudioNativeProjectContentV1AudioNativeProjectIdContentPost} request
     * @param {AudioNative.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.audioNative.update("21m00Tcm4TlvDq8ikWAM", {})
     */
    update(project_id: string, request: ElevenLabs.BodyUpdateAudioNativeProjectContentV1AudioNativeProjectIdContentPost, requestOptions?: AudioNative.RequestOptions): core.HttpResponsePromise<ElevenLabs.AudioNativeEditContentResponseModel>;
    private __update;
}
