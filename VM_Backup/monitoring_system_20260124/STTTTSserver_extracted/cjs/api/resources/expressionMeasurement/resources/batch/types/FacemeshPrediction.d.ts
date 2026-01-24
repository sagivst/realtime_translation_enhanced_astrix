import type * as Hume from "../../../../../index.js";
export interface FacemeshPrediction {
    /** A high-dimensional embedding in emotion space. */
    emotions: Hume.expressionMeasurement.batch.EmotionScore[];
}
