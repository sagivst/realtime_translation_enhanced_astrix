export declare const VoiceProvider: {
    readonly HumeAi: "HUME_AI";
    readonly CustomVoice: "CUSTOM_VOICE";
};
export type VoiceProvider = (typeof VoiceProvider)[keyof typeof VoiceProvider];
