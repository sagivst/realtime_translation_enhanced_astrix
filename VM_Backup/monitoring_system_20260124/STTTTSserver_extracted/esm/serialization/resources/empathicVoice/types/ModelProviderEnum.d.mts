import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ModelProviderEnum: core.serialization.Schema<serializers.empathicVoice.ModelProviderEnum.Raw, Hume.empathicVoice.ModelProviderEnum>;
export declare namespace ModelProviderEnum {
    type Raw = "GROQ" | "OPEN_AI" | "FIREWORKS" | "ANTHROPIC" | "CUSTOM_LANGUAGE_MODEL" | "GOOGLE" | "HUME_AI" | "AMAZON_BEDROCK" | "PERPLEXITY" | "SAMBANOVA" | "CEREBRAS";
}
