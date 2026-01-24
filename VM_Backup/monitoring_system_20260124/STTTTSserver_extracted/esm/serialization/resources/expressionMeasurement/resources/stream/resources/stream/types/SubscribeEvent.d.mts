import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamErrorMessage } from "./StreamErrorMessage.mjs";
import { StreamModelPredictions } from "./StreamModelPredictions.mjs";
import { StreamWarningMessage } from "./StreamWarningMessage.mjs";
export declare const SubscribeEvent: core.serialization.Schema<serializers.expressionMeasurement.stream.SubscribeEvent.Raw, Hume.expressionMeasurement.stream.SubscribeEvent>;
export declare namespace SubscribeEvent {
    type Raw = StreamModelPredictions.Raw | StreamErrorMessage.Raw | StreamWarningMessage.Raw;
}
