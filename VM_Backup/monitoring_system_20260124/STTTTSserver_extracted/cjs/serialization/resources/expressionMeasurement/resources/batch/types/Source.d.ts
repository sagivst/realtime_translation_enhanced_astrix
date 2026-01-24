import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { SourceFile } from "./SourceFile.js";
import { SourceTextSource } from "./SourceTextSource.js";
import { SourceUrl } from "./SourceUrl.js";
export declare const Source: core.serialization.Schema<serializers.expressionMeasurement.batch.Source.Raw, Hume.expressionMeasurement.batch.Source>;
export declare namespace Source {
    type Raw = Source.Url | Source.File | Source.Text;
    interface Url extends SourceUrl.Raw {
        type: "url";
    }
    interface File extends SourceFile.Raw {
        type: "file";
    }
    interface Text extends SourceTextSource.Raw {
        type: "text";
    }
}
