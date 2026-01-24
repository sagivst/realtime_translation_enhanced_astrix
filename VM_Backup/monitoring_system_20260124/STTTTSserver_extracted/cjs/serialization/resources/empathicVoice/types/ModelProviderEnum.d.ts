import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ModelProviderEnum: core.serialization.Schema<serializers.empathicVoice.ModelProviderEnum.Raw, Hume.empathicVoice.ModelProviderEnum>;
export declare namespace ModelProviderEnum {
    type Raw = "GROQ" | "OPEN_AI" | "FIREWORKS" | "ANTHROPIC" | "CUSTOM_LANGUAGE_MODEL" | "GOOGLE" | "HUME_AI" | "AMAZON_BEDROCK" | "PERPLEXITY" | "SAMBANOVA" | "CEREBRAS";
}
