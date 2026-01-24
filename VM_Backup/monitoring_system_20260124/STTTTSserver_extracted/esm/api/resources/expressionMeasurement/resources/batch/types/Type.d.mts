export declare const Type: {
    readonly EmbeddingGeneration: "EMBEDDING_GENERATION";
    readonly Inference: "INFERENCE";
    readonly TlInference: "TL_INFERENCE";
    readonly Training: "TRAINING";
};
export type Type = (typeof Type)[keyof typeof Type];
