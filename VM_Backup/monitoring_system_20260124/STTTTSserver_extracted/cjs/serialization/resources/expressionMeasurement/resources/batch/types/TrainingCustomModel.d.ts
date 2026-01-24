import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const TrainingCustomModel: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TrainingCustomModel.Raw, Hume.expressionMeasurement.batch.TrainingCustomModel>;
export declare namespace TrainingCustomModel {
    interface Raw {
        id: string;
        version_id?: string | null;
    }
}
