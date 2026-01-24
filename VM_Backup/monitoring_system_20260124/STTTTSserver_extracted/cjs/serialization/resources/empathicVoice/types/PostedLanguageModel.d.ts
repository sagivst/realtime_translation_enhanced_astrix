import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { LanguageModelType } from "./LanguageModelType.js";
import { ModelProviderEnum } from "./ModelProviderEnum.js";
export declare const PostedLanguageModel: core.serialization.ObjectSchema<serializers.empathicVoice.PostedLanguageModel.Raw, Hume.empathicVoice.PostedLanguageModel>;
export declare namespace PostedLanguageModel {
    interface Raw {
        model_provider?: ModelProviderEnum.Raw | null;
        model_resource?: LanguageModelType.Raw | null;
        temperature?: number | null;
    }
}
