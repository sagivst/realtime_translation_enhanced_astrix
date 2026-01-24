import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { File_ } from "./File_.js";
export declare const SourceFile: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.SourceFile.Raw, Hume.expressionMeasurement.batch.SourceFile>;
export declare namespace SourceFile {
    interface Raw extends File_.Raw {
    }
}
