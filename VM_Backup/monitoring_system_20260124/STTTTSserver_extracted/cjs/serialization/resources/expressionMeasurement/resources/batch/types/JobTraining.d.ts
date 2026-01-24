import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { StateTraining } from "./StateTraining.js";
import { TrainingBaseRequest } from "./TrainingBaseRequest.js";
export declare const JobTraining: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobTraining.Raw, Hume.expressionMeasurement.batch.JobTraining>;
export declare namespace JobTraining {
    interface Raw {
        job_id: string;
        user_id: string;
        request: TrainingBaseRequest.Raw;
        state: StateTraining.Raw;
    }
}
