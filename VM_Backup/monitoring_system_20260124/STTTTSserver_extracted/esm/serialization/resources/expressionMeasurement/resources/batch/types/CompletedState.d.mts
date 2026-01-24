import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { CompletedInference } from "./CompletedInference.mjs";
export declare const CompletedState: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CompletedState.Raw, Hume.expressionMeasurement.batch.CompletedState>;
export declare namespace CompletedState {
    interface Raw extends CompletedInference.Raw {
    }
}
