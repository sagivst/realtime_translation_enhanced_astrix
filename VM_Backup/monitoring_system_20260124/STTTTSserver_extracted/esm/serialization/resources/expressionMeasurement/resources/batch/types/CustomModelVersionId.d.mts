import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const CustomModelVersionId: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelVersionId.Raw, Hume.expressionMeasurement.batch.CustomModelVersionId>;
export declare namespace CustomModelVersionId {
    interface Raw {
        version_id: string;
    }
}
