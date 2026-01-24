import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { CompletedState } from "./CompletedState.js";
import { FailedState } from "./FailedState.js";
import { InProgressState } from "./InProgressState.js";
import { QueuedState } from "./QueuedState.js";
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
