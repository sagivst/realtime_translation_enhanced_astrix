import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Target } from "./Target.js";
export declare const ValidationArgs: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.ValidationArgs.Raw, Hume.expressionMeasurement.batch.ValidationArgs>;
export declare namespace ValidationArgs {
    interface Raw {
        positive_label?: Target.Raw | null;
    }
}
