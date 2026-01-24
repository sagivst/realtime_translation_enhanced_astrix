import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const File_: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.File_.Raw, Hume.expressionMeasurement.batch.File_>;
export declare namespace File_ {
    interface Raw {
        filename?: string | null;
        content_type?: string | null;
        md5sum: string;
    }
}
