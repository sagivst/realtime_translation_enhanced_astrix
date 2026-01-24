import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamErrorMessage } from "./StreamErrorMessage.js";
import { StreamModelPredictions } from "./StreamModelPredictions.js";
import { StreamWarningMessage } from "./StreamWarningMessage.js";
export declare const SubscribeEvent: core.serialization.Schema<serializers.expressionMeasurement.stream.SubscribeEvent.Raw, Hume.expressionMeasurement.stream.SubscribeEvent>;
export declare namespace SubscribeEvent {
    type Raw = StreamModelPredictions.Raw | StreamErrorMessage.Raw | StreamWarningMessage.Raw;
}
