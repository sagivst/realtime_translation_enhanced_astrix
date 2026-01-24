export interface HumeEnvironmentUrls {
    base: string;
    evi: string;
    tts: string;
    stream: string;
}
export declare const HumeEnvironment: {
    readonly Prod: {
        readonly base: "https://api.hume.ai";
        readonly evi: "wss://api.hume.ai/v0/evi";
        readonly tts: "wss://api.hume.ai/v0/tts";
        readonly stream: "wss://api.hume.ai/v0/stream";
    };
};
export type HumeEnvironment = typeof HumeEnvironment.Prod;
