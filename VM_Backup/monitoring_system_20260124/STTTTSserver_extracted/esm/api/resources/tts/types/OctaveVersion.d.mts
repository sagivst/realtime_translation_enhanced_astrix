/**
 * Selects the Octave model version used to synthesize speech for this request. If you omit this field, Hume automatically routes the request to the most appropriate model. Setting a specific version ensures stable and repeatable behavior across requests.
 *
 * Use `2` to opt into the latest Octave capabilities. When you specify version `2`, you must also provide a `voice`. Requests that set `version: 2` without a voice will be rejected.
 *
 * For a comparison of Octave versions, see the [Octave versions](/docs/text-to-speech-tts/overview#octave-versions) section in the TTS overview.
 */
export declare const OctaveVersion: {
    readonly One: "1";
    readonly Two: "2";
};
export type OctaveVersion = (typeof OctaveVersion)[keyof typeof OctaveVersion];
