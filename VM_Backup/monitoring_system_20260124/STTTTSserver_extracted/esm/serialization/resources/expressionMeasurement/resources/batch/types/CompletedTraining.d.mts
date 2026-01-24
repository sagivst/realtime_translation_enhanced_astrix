import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { TrainingCustomModel } from "./TrainingCustomModel.mjs";
export declare const CompletedTraining: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CompletedTraining.Raw, Hume.expressionMeasurement.batch.CompletedTraining>;
export declare namespace CompletedTraining {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
        ended_timestamp_ms: number;
        custom_model: TrainingCustomModel.Raw;
        alternatives?: Record<string, TrainingCustomModel.Raw> | null;
    }
}
