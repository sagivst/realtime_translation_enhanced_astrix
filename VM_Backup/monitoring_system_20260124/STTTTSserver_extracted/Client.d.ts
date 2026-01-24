import { AudioIsolation } from "./api/resources/audioIsolation/client/Client";
import { AudioNative } from "./api/resources/audioNative/client/Client";
import { ConversationalAi } from "./api/resources/conversationalAi/client/Client";
import { Dubbing } from "./api/resources/dubbing/client/Client";
import { ForcedAlignment } from "./api/resources/forcedAlignment/client/Client";
import { History } from "./api/resources/history/client/Client";
import { Models } from "./api/resources/models/client/Client";
import { Music } from "./api/resources/music/client/Client";
import { PronunciationDictionaries } from "./api/resources/pronunciationDictionaries/client/Client";
import { Samples } from "./api/resources/samples/client/Client";
import { ServiceAccounts } from "./api/resources/serviceAccounts/client/Client";
import { SpeechToSpeech } from "./api/resources/speechToSpeech/client/Client";
import { SpeechToText } from "./api/resources/speechToText/client/Client";
import { Studio } from "./api/resources/studio/client/Client";
import { TextToDialogue } from "./api/resources/textToDialogue/client/Client";
import { TextToSoundEffects } from "./api/resources/textToSoundEffects/client/Client";
import { TextToSpeech } from "./api/resources/textToSpeech/client/Client";
import { TextToVoice } from "./api/resources/textToVoice/client/Client";
import { Tokens } from "./api/resources/tokens/client/Client";
import { Usage } from "./api/resources/usage/client/Client";
import { User } from "./api/resources/user/client/Client";
import { Voices } from "./api/resources/voices/client/Client";
import { Webhooks } from "./api/resources/webhooks/client/Client";
import { Workspace } from "./api/resources/workspace/client/Client";
import type { BaseClientOptions, BaseRequestOptions } from "./BaseClient";
import * as core from "./core";
export declare namespace ElevenLabsClient {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ElevenLabsClient {
    protected readonly _options: ElevenLabsClient.Options;
    protected _history: History | undefined;
    protected _textToSoundEffects: TextToSoundEffects | undefined;
    protected _audioIsolation: AudioIsolation | undefined;
    protected _samples: Samples | undefined;
    protected _textToSpeech: TextToSpeech | undefined;
    protected _textToDialogue: TextToDialogue | undefined;
    protected _speechToSpeech: SpeechToSpeech | undefined;
    protected _textToVoice: TextToVoice | undefined;
    protected _user: User | undefined;
    protected _voices: Voices | undefined;
    protected _studio: Studio | undefined;
    protected _dubbing: Dubbing | undefined;
    protected _models: Models | undefined;
    protected _audioNative: AudioNative | undefined;
    protected _usage: Usage | undefined;
    protected _pronunciationDictionaries: PronunciationDictionaries | undefined;
    protected _serviceAccounts: ServiceAccounts | undefined;
    protected _webhooks: Webhooks | undefined;
    protected _speechToText: SpeechToText | undefined;
    protected _forcedAlignment: ForcedAlignment | undefined;
    protected _conversationalAi: ConversationalAi | undefined;
    protected _music: Music | undefined;
    protected _tokens: Tokens | undefined;
    protected _workspace: Workspace | undefined;
    constructor(_options?: ElevenLabsClient.Options);
    get history(): History;
    get textToSoundEffects(): TextToSoundEffects;
    get audioIsolation(): AudioIsolation;
    get samples(): Samples;
    get textToSpeech(): TextToSpeech;
    get textToDialogue(): TextToDialogue;
    get speechToSpeech(): SpeechToSpeech;
    get textToVoice(): TextToVoice;
    get user(): User;
    get voices(): Voices;
    get studio(): Studio;
    get dubbing(): Dubbing;
    get models(): Models;
    get audioNative(): AudioNative;
    get usage(): Usage;
    get pronunciationDictionaries(): PronunciationDictionaries;
    get serviceAccounts(): ServiceAccounts;
    get webhooks(): Webhooks;
    get speechToText(): SpeechToText;
    get forcedAlignment(): ForcedAlignment;
    get conversationalAi(): ConversationalAi;
    get music(): Music;
    get tokens(): Tokens;
    get workspace(): Workspace;
    /**
     * Add a generated voice to the voice library.
     *
     * @param {ElevenLabsClient.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @example
     *     await client.saveAVoicePreview()
     */
    saveAVoicePreview(requestOptions?: ElevenLabsClient.RequestOptions): core.HttpResponsePromise<void>;
    private __saveAVoicePreview;
}
