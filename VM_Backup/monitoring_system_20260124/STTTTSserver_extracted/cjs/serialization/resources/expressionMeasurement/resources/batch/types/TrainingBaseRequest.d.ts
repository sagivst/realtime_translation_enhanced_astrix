import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Alternative } from "./Alternative.js";
import { CustomModelRequest } from "./CustomModelRequest.js";
import { Dataset } from "./Dataset.js";
import { EvaluationArgs } from "./EvaluationArgs.js";
import { Task } from "./Task.js";
export declare const TrainingBaseRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TrainingBaseRequest.Raw, Hume.expressionMeasurement.batch.TrainingBaseRequest>;
export declare namespace TrainingBaseRequest {
    interface Raw {
        custom_model: CustomModelRequest.Raw;
        dataset: Dataset.Raw;
        target_feature?: string | null;
        task?: Task.Raw | null;
        evaluation?: EvaluationArgs.Raw | null;
        alternatives?: Alternative.Raw[] | null;
        callback_url?: string | null;
        notify?: boolean | null;
    }
}
