import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { File_ } from "./File_.mjs";
export declare const SourceFile: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.SourceFile.Raw, Hume.expressionMeasurement.batch.SourceFile>;
export declare namespace SourceFile {
    interface Raw extends File_.Raw {
    }
}
