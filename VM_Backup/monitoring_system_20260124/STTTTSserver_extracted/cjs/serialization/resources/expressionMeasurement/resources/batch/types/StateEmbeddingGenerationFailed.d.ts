import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Failed } from "./Failed.js";
export declare const StateEmbeddingGenerationFailed: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateEmbeddingGenerationFailed.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGenerationFailed>;
export declare namespace StateEmbeddingGenerationFailed {
    interface Raw extends Failed.Raw {
    }
}
