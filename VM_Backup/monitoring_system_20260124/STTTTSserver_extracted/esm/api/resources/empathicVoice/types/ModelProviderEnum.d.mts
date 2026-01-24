export declare const ModelProviderEnum: {
    readonly Groq: "GROQ";
    readonly OpenAi: "OPEN_AI";
    readonly Fireworks: "FIREWORKS";
    readonly Anthropic: "ANTHROPIC";
    readonly CustomLanguageModel: "CUSTOM_LANGUAGE_MODEL";
    readonly Google: "GOOGLE";
    readonly HumeAi: "HUME_AI";
    readonly AmazonBedrock: "AMAZON_BEDROCK";
    readonly Perplexity: "PERPLEXITY";
    readonly Sambanova: "SAMBANOVA";
    readonly Cerebras: "CEREBRAS";
};
export type ModelProviderEnum = (typeof ModelProviderEnum)[keyof typeof ModelProviderEnum];
