import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const DatasetVersionId: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.DatasetVersionId.Raw, Hume.expressionMeasurement.batch.DatasetVersionId>;
export declare namespace DatasetVersionId {
    interface Raw {
        version_id: string;
    }
}
