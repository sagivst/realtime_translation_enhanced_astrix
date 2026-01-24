import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { TrainingCustomModel } from "./TrainingCustomModel.js";
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
