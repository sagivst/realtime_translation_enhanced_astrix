import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Error_: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Error_.Raw, Hume.expressionMeasurement.batch.Error_>;
export declare namespace Error_ {
    interface Raw {
        message: string;
        file: string;
    }
}
