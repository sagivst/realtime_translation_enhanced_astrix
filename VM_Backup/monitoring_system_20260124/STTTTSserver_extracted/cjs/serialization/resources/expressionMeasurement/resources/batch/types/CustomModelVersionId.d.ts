import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const CustomModelVersionId: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelVersionId.Raw, Hume.expressionMeasurement.batch.CustomModelVersionId>;
export declare namespace CustomModelVersionId {
    interface Raw {
        version_id: string;
    }
}
