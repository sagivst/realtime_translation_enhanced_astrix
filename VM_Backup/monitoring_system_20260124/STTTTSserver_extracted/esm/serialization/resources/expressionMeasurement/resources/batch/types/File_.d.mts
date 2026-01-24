import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const File_: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.File_.Raw, Hume.expressionMeasurement.batch.File_>;
export declare namespace File_ {
    interface Raw {
        filename?: string | null;
        content_type?: string | null;
        md5sum: string;
    }
}
