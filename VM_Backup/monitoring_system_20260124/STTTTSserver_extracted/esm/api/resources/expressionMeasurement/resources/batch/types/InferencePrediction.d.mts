import type * as Hume from "../../../../../index.mjs";
export interface InferencePrediction {
    /** A file path relative to the top level source URL or file. */
    file: string;
    models: Hume.expressionMeasurement.batch.ModelsPredictions;
}
