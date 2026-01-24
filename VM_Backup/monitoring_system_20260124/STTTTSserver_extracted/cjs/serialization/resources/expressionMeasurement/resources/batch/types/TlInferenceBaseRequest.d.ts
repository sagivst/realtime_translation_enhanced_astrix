import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { CustomModel } from "./CustomModel.js";
export declare const TlInferenceBaseRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TlInferenceBaseRequest.Raw, Hume.expressionMeasurement.batch.TlInferenceBaseRequest>;
export declare namespace TlInferenceBaseRequest {
    interface Raw {
        custom_model: CustomModel.Raw;
        urls?: string[] | null;
        callback_url?: string | null;
        notify?: boolean | null;
    }
}
