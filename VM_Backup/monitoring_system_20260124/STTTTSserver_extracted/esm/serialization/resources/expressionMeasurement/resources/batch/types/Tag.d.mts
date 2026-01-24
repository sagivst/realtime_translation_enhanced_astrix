import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Tag: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Tag.Raw, Hume.expressionMeasurement.batch.Tag>;
export declare namespace Tag {
    interface Raw {
        key: string;
        value: string;
    }
}
