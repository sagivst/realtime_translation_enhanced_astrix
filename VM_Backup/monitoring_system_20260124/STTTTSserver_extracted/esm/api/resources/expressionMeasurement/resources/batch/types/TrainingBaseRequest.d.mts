import type * as Hume from "../../../../../index.mjs";
export interface TrainingBaseRequest {
    customModel: Hume.expressionMeasurement.batch.CustomModelRequest;
    dataset: Hume.expressionMeasurement.batch.Dataset;
    targetFeature?: string;
    task?: Hume.expressionMeasurement.batch.Task;
    evaluation?: Hume.expressionMeasurement.batch.EvaluationArgs;
    alternatives?: Hume.expressionMeasurement.batch.Alternative[];
    callbackUrl?: string;
    notify?: boolean;
}
