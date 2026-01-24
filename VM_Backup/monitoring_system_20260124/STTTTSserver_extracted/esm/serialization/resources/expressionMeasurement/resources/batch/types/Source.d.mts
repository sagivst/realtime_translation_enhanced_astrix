import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { SourceFile } from "./SourceFile.mjs";
import { SourceTextSource } from "./SourceTextSource.mjs";
import { SourceUrl } from "./SourceUrl.mjs";
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
