import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { CompletedState } from "./CompletedState.mjs";
import { FailedState } from "./FailedState.mjs";
import { InProgressState } from "./InProgressState.mjs";
import { QueuedState } from "./QueuedState.mjs";
export declare const StateInference: core.serialization.Schema<serializers.expressionMeasurement.batch.StateInference.Raw, Hume.expressionMeasurement.batch.StateInference>;
export declare namespace StateInference {
    type Raw = StateInference.Queued | StateInference.InProgress | StateInference.Completed | StateInference.Failed;
    interface Queued extends QueuedState.Raw {
        status: "QUEUED";
    }
    interface InProgress extends InProgressState.Raw {
        status: "IN_PROGRESS";
    }
    interface Completed extends CompletedState.Raw {
        status: "COMPLETED";
    }
    interface Failed extends FailedState.Raw {
        status: "FAILED";
    }
}
