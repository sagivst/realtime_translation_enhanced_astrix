import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { JobTraining } from "./JobTraining.js";
export declare const CustomModelsTrainingJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelsTrainingJob.Raw, Hume.expressionMeasurement.batch.CustomModelsTrainingJob>;
export declare namespace CustomModelsTrainingJob {
    interface Raw extends JobTraining.Raw {
        type: string;
    }
}
