import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const DatasetId: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.DatasetId.Raw, Hume.expressionMeasurement.batch.DatasetId>;
export declare namespace DatasetId {
    interface Raw {
        id: string;
    }
}
