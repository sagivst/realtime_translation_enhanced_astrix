import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Alternative } from "./Alternative.mjs";
import { CustomModelRequest } from "./CustomModelRequest.mjs";
import { Dataset } from "./Dataset.mjs";
import { EvaluationArgs } from "./EvaluationArgs.mjs";
import { Task } from "./Task.mjs";
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
