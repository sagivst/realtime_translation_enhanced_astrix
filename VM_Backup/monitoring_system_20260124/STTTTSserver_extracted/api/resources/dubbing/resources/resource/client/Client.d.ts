import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
import { Language } from "../resources/language/client/Client";
import { Segment } from "../resources/segment/client/Client";
import { Speaker } from "../resources/speaker/client/Client";
export declare namespace Resource {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Resource {
    protected readonly _options: Resource.Options;
    protected _language: Language | undefined;
    protected _segment: Segment | undefined;
    protected _speaker: Speaker | undefined;
    constructor(_options?: Resource.Options);
    get language(): Language;
    get segment(): Segment;
    get speaker(): Speaker;
    /**
     * Given a dubbing ID generated from the '/v1/dubbing' endpoint with studio enabled, returns the dubbing resource.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {Resource.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.get("dubbing_id")
     */
    get(dubbing_id: string, requestOptions?: Resource.RequestOptions): core.HttpResponsePromise<ElevenLabs.DubbingResource>;
    private __get;
    /**
     * Regenerate the transcriptions for the specified segments. Does not automatically regenerate translations or dubs.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {ElevenLabs.dubbing.BodyTranscribesSegmentsV1DubbingResourceDubbingIdTranscribePost} request
     * @param {Resource.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.transcribe("dubbing_id", {
     *         segments: ["segments"]
     *     })
     */
    transcribe(dubbing_id: string, request: ElevenLabs.dubbing.BodyTranscribesSegmentsV1DubbingResourceDubbingIdTranscribePost, requestOptions?: Resource.RequestOptions): core.HttpResponsePromise<ElevenLabs.SegmentTranscriptionResponse>;
    private __transcribe;
    /**
     * Regenerate the translations for either the entire resource or the specified segments/languages. Will automatically transcribe missing transcriptions. Will not automatically regenerate the dubs.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {ElevenLabs.dubbing.BodyTranslatesAllOrSomeSegmentsAndLanguagesV1DubbingResourceDubbingIdTranslatePost} request
     * @param {Resource.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.translate("dubbing_id", {
     *         segments: ["segments"]
     *     })
     */
    translate(dubbing_id: string, request: ElevenLabs.dubbing.BodyTranslatesAllOrSomeSegmentsAndLanguagesV1DubbingResourceDubbingIdTranslatePost, requestOptions?: Resource.RequestOptions): core.HttpResponsePromise<ElevenLabs.SegmentTranslationResponse>;
    private __translate;
    /**
     * Regenerate the dubs for either the entire resource or the specified segments/languages. Will automatically transcribe and translate any missing transcriptions and translations.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {ElevenLabs.dubbing.BodyDubsAllOrSomeSegmentsAndLanguagesV1DubbingResourceDubbingIdDubPost} request
     * @param {Resource.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.dub("dubbing_id", {
     *         segments: ["segments"]
     *     })
     */
    dub(dubbing_id: string, request: ElevenLabs.dubbing.BodyDubsAllOrSomeSegmentsAndLanguagesV1DubbingResourceDubbingIdDubPost, requestOptions?: Resource.RequestOptions): core.HttpResponsePromise<ElevenLabs.SegmentDubResponse>;
    private __dub;
    /**
     * Regenerate the output media for a language using the latest Studio state. Please ensure all segments have been dubbed before rendering, otherwise they will be omitted. Renders are generated asynchronously, and to check the status of all renders please use the 'Get Dubbing Resource' endpoint.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {ElevenLabs.dubbing.ResourceRenderRequestLanguage} language - The target language code to render, eg. 'es'. To render the source track use 'original'.
     * @param {ElevenLabs.dubbing.BodyRenderAudioOrVideoForTheGivenLanguageV1DubbingResourceDubbingIdRenderLanguagePost} request
     * @param {Resource.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.render("dubbing_id", "language", {
     *         renderType: "mp4"
     *     })
     */
    render(dubbing_id: string, language: ElevenLabs.dubbing.ResourceRenderRequestLanguage, request: ElevenLabs.dubbing.BodyRenderAudioOrVideoForTheGivenLanguageV1DubbingResourceDubbingIdRenderLanguagePost, requestOptions?: Resource.RequestOptions): core.HttpResponsePromise<ElevenLabs.DubbingRenderResponseModel>;
    private __render;
}
