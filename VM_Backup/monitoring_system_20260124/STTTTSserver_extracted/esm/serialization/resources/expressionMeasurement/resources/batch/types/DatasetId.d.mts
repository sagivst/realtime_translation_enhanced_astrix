import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const DatasetId: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.DatasetId.Raw, Hume.expressionMeasurement.batch.DatasetId>;
export declare namespace DatasetId {
    interface Raw {
        id: string;
    }
}
