import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Queued } from "./Queued.js";
export declare const StateEmbeddingGenerationQueued: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateEmbeddingGenerationQueued.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGenerationQueued>;
export declare namespace StateEmbeddingGenerationQueued {
    interface Raw extends Queued.Raw {
    }
}
