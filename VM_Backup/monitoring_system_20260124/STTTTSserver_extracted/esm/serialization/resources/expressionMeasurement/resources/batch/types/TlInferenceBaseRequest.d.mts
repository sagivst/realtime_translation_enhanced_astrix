import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { CustomModel } from "./CustomModel.mjs";
export declare const TlInferenceBaseRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TlInferenceBaseRequest.Raw, Hume.expressionMeasurement.batch.TlInferenceBaseRequest>;
export declare namespace TlInferenceBaseRequest {
    interface Raw {
        custom_model: CustomModel.Raw;
        urls?: string[] | null;
        callback_url?: string | null;
        notify?: boolean | null;
    }
}
