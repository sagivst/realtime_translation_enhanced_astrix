import type * as Hume from "../../../../../../../index.mjs";
export type SubscribeEvent = 
/**
 * Model predictions */
Hume.expressionMeasurement.stream.StreamModelPredictions
/**
 * Error message */
 | Hume.expressionMeasurement.stream.StreamErrorMessage
/**
 * Warning message */
 | Hume.expressionMeasurement.stream.StreamWarningMessage;
