import type * as Hume from "../../../../../index.mjs";
export interface TlInferencePrediction {
    /** A file path relative to the top level source URL or file. */
    file: string;
    fileType: string;
    customModels: Record<string, Hume.expressionMeasurement.batch.CustomModelPrediction>;
}
