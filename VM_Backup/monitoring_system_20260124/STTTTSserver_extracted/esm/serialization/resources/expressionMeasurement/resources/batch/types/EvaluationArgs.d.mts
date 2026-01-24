import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { ValidationArgs } from "./ValidationArgs.mjs";
export declare const EvaluationArgs: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.EvaluationArgs.Raw, Hume.expressionMeasurement.batch.EvaluationArgs>;
export declare namespace EvaluationArgs {
    interface Raw {
        validation?: ValidationArgs.Raw | null;
    }
}
