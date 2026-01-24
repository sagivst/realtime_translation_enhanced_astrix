import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { LanguageModelType } from "./LanguageModelType.js";
import { ModelProviderEnum } from "./ModelProviderEnum.js";
export declare const ReturnLanguageModel: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnLanguageModel.Raw, Hume.empathicVoice.ReturnLanguageModel>;
export declare namespace ReturnLanguageModel {
    interface Raw {
        model_provider?: ModelProviderEnum.Raw | null;
        model_resource?: LanguageModelType.Raw | null;
        temperature?: number | null;
    }
}
