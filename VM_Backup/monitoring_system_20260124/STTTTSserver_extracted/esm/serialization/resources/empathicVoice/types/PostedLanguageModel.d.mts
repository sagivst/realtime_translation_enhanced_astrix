import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { LanguageModelType } from "./LanguageModelType.mjs";
import { ModelProviderEnum } from "./ModelProviderEnum.mjs";
export declare const PostedLanguageModel: core.serialization.ObjectSchema<serializers.empathicVoice.PostedLanguageModel.Raw, Hume.empathicVoice.PostedLanguageModel>;
export declare namespace PostedLanguageModel {
    interface Raw {
        model_provider?: ModelProviderEnum.Raw | null;
        model_resource?: LanguageModelType.Raw | null;
        temperature?: number | null;
    }
}
