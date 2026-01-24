import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { StateTlInferenceCompletedTlInference } from "./StateTlInferenceCompletedTlInference.mjs";
import { StateTlInferenceFailed } from "./StateTlInferenceFailed.mjs";
import { StateTlInferenceInProgress } from "./StateTlInferenceInProgress.mjs";
import { StateTlInferenceQueued } from "./StateTlInferenceQueued.mjs";
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
