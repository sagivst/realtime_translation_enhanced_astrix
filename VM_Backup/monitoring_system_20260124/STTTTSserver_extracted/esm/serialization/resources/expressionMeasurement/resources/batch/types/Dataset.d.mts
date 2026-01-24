import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { DatasetId } from "./DatasetId.mjs";
import { DatasetVersionId } from "./DatasetVersionId.mjs";
export declare const Dataset: core.serialization.Schema<serializers.expressionMeasurement.batch.Dataset.Raw, Hume.expressionMeasurement.batch.Dataset>;
export declare namespace Dataset {
    type Raw = DatasetId.Raw | DatasetVersionId.Raw;
}
