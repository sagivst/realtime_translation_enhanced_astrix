import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient.js";
import * as core from "../../../../core/index.js";
import * as Hume from "../../../index.js";
import { StreamInput } from "../resources/streamInput/client/Client.js";
import { Voices } from "../resources/voices/client/Client.js";
export declare namespace Tts {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Tts {
    protected readonly _options: Tts.Options;
    protected _voices: Voices | undefined;
    protected _streamInput: StreamInput | undefined;
    constructor(_options?: Tts.Options);
    get voices(): Voices;
    get streamInput(): StreamInput;
    /**
     * Synthesizes one or more input texts into speech using the specified voice. If no voice is provided, a novel voice will be generated dynamically. Optionally, additional context can be included to influence the speech's style and prosody.
     *
     * The response includes the base64-encoded audio and metadata in JSON format.
     *
     * @param {Hume.tts.PostedTts} request
     * @param {Tts.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Hume.tts.UnprocessableEntityError}
     *
     * @example
     *     await client.tts.synthesizeJson({
     *         context: {
     *             utterances: [{
     *                     text: "How can people see beauty so differently?",
     *                     description: "A curious student with a clear and respectful tone, seeking clarification on Hume's ideas with a straightforward question."
     *                 }]
     *         },
     *         format: {
     *             type: "mp3"
     *         },
     *         numGenerations: 1,
     *         utterances: [{
     *                 text: "Beauty is no quality in things themselves: It exists merely in the mind which contemplates them.",
     *                 description: "Middle-aged masculine voice with a clear, rhythmic Scots lilt, rounded vowels, and a warm, steady tone with an articulate, academic quality."
     *             }]
     *     })
     */
    synthesizeJson(request: Hume.tts.PostedTts, requestOptions?: Tts.RequestOptions): core.HttpResponsePromise<Hume.tts.ReturnTts>;
    private __synthesizeJson;
    /**
     * Synthesizes one or more input texts into speech using the specified voice. If no voice is provided, a novel voice will be generated dynamically. Optionally, additional context can be included to influence the speech's style and prosody.
     *
     * The response contains the generated audio file in the requested format.
     * @throws {@link Hume.tts.UnprocessableEntityError}
     */
    synthesizeFile(request: Hume.tts.PostedTts, requestOptions?: Tts.RequestOptions): core.HttpResponsePromise<core.BinaryResponse>;
    private __synthesizeFile;
    /**
     * Streams synthesized speech using the specified voice. If no voice is provided, a novel voice will be generated dynamically. Optionally, additional context can be included to influence the speech's style and prosody.
     * @throws {@link Hume.tts.UnprocessableEntityError}
     */
    synthesizeFileStreaming(request: Hume.tts.PostedTts, requestOptions?: Tts.RequestOptions): core.HttpResponsePromise<core.BinaryResponse>;
    private __synthesizeFileStreaming;
    /**
     * Streams synthesized speech using the specified voice. If no voice is provided, a novel voice will be generated dynamically. Optionally, additional context can be included to influence the speech's style and prosody.
     *
     * The response is a stream of JSON objects including audio encoded in base64.
     */
    synthesizeJsonStreaming(request: Hume.tts.PostedTts, requestOptions?: Tts.RequestOptions): core.HttpResponsePromise<core.Stream<Hume.tts.TtsOutput>>;
    private __synthesizeJsonStreaming;
    /**
     * @throws {@link Hume.tts.UnprocessableEntityError}
     */
    convertVoiceFile(request: Hume.tts.ConvertVoiceFileRequest, requestOptions?: Tts.RequestOptions): core.HttpResponsePromise<core.BinaryResponse>;
    private __convertVoiceFile;
    convertVoiceJson(request: Hume.tts.ConvertVoiceJsonRequest, requestOptions?: Tts.RequestOptions): core.HttpResponsePromise<core.Stream<Hume.tts.TtsOutput>>;
    private __convertVoiceJson;
    protected _getCustomAuthorizationHeaders(): Promise<Record<string, string | undefined>>;
}
