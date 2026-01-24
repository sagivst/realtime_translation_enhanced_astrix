export declare const AudioFormatType: {
    readonly Mp3: "mp3";
    readonly Pcm: "pcm";
    readonly Wav: "wav";
};
export type AudioFormatType = (typeof AudioFormatType)[keyof typeof AudioFormatType];
