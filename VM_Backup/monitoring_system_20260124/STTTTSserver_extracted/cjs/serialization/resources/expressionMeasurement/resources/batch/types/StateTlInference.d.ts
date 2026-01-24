import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { StateTlInferenceCompletedTlInference } from "./StateTlInferenceCompletedTlInference.js";
import { StateTlInferenceFailed } from "./StateTlInferenceFailed.js";
import { StateTlInferenceInProgress } from "./StateTlInferenceInProgress.js";
import { StateTlInferenceQueued } from "./StateTlInferenceQueued.js";
export declare const StateTlInference: core.serialization.Schema<serializers.expressionMeasurement.batch.StateTlInference.Raw, Hume.expressionMeasurement.batch.StateTlInference>;
export declare namespace StateTlInference {
    type Raw = StateTlInference.Queued | StateTlInference.InProgress | StateTlInference.Completed | StateTlInference.Failed;
    interface Queued extends StateTlInferenceQueued.Raw {
        status: "QUEUED";
    }
    interface InProgress extends StateTlInferenceInProgress.Raw {
        status: "IN_PROGRESS";
    }
    interface Completed extends StateTlInferenceCompletedTlInference.Raw {
        status: "COMPLETED";
    }
    interface Failed extends StateTlInferenceFailed.Raw {
        status: "FAILED";
    }
}
