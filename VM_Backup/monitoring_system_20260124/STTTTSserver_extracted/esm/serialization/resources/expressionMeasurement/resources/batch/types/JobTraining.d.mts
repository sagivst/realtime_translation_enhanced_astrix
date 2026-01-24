import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { StateTraining } from "./StateTraining.mjs";
import { TrainingBaseRequest } from "./TrainingBaseRequest.mjs";
export declare const JobTraining: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobTraining.Raw, Hume.expressionMeasurement.batch.JobTraining>;
export declare namespace JobTraining {
    interface Raw {
        job_id: string;
        user_id: string;
        request: TrainingBaseRequest.Raw;
        state: StateTraining.Raw;
    }
}
