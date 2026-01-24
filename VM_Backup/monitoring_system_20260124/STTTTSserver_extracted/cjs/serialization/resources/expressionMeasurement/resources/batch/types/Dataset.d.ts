import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { DatasetId } from "./DatasetId.js";
import { DatasetVersionId } from "./DatasetVersionId.js";
export declare const Dataset: core.serialization.Schema<serializers.expressionMeasurement.batch.Dataset.Raw, Hume.expressionMeasurement.batch.Dataset>;
export declare namespace Dataset {
    type Raw = DatasetId.Raw | DatasetVersionId.Raw;
}
