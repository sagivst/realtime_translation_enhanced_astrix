import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Failed } from "./Failed.mjs";
export declare const StateEmbeddingGenerationFailed: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateEmbeddingGenerationFailed.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGenerationFailed>;
export declare namespace StateEmbeddingGenerationFailed {
    interface Raw extends Failed.Raw {
    }
}
