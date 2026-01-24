import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Error_: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Error_.Raw, Hume.expressionMeasurement.batch.Error_>;
export declare namespace Error_ {
    interface Raw {
        message: string;
        file: string;
    }
}
