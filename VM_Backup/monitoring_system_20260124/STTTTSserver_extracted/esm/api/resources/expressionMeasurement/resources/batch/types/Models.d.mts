import type * as Hume from "../../../../../index.mjs";
/**
 * The models used for inference.
 */
export interface Models {
    face?: Hume.expressionMeasurement.batch.Face;
    burst?: Hume.expressionMeasurement.batch.Unconfigurable;
    prosody?: Hume.expressionMeasurement.batch.Prosody;
    language?: Hume.expressionMeasurement.batch.Language;
    ner?: Hume.expressionMeasurement.batch.Ner;
    facemesh?: Hume.expressionMeasurement.batch.Unconfigurable;
}
