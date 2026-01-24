import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { JobTraining } from "./JobTraining.mjs";
export declare const CustomModelsTrainingJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelsTrainingJob.Raw, Hume.expressionMeasurement.batch.CustomModelsTrainingJob>;
export declare namespace CustomModelsTrainingJob {
    interface Raw extends JobTraining.Raw {
        type: string;
    }
}
