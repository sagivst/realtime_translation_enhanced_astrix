import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Tag: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Tag.Raw, Hume.expressionMeasurement.batch.Tag>;
export declare namespace Tag {
    interface Raw {
        key: string;
        value: string;
    }
}
