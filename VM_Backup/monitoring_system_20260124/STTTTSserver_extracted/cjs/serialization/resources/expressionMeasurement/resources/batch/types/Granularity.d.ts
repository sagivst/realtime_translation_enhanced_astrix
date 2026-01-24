import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Granularity: core.serialization.Schema<serializers.expressionMeasurement.batch.Granularity.Raw, Hume.expressionMeasurement.batch.Granularity>;
export declare namespace Granularity {
    type Raw = "word" | "sentence" | "utterance" | "conversational_turn";
}
