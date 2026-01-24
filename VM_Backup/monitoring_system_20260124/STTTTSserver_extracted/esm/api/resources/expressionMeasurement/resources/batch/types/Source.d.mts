import type * as Hume from "../../../../../index.mjs";
export type Source = Hume.expressionMeasurement.batch.Source.Url | Hume.expressionMeasurement.batch.Source.File_ | Hume.expressionMeasurement.batch.Source.Text;
export declare namespace Source {
    interface Url extends Hume.expressionMeasurement.batch.SourceUrl {
        type: "url";
    }
    interface File_ extends Hume.expressionMeasurement.batch.SourceFile {
        type: "file";
    }
    interface Text extends Hume.expressionMeasurement.batch.SourceTextSource {
        type: "text";
    }
}
