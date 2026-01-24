import type * as Hume from "../../../../../../../../../api/index.js";
import * as core from "../../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../../index.js";
import { SubscribeEvent } from "../../types/SubscribeEvent.js";
export declare const StreamSocketResponse: core.serialization.Schema<serializers.expressionMeasurement.stream.StreamSocketResponse.Raw, Hume.expressionMeasurement.stream.SubscribeEvent>;
export declare namespace StreamSocketResponse {
    type Raw = SubscribeEvent.Raw;
}
