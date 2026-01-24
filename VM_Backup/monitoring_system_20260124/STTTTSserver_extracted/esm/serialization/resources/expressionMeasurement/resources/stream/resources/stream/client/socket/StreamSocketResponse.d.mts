import type * as Hume from "../../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../../index.mjs";
import { SubscribeEvent } from "../../types/SubscribeEvent.mjs";
export declare const StreamSocketResponse: core.serialization.Schema<serializers.expressionMeasurement.stream.StreamSocketResponse.Raw, Hume.expressionMeasurement.stream.SubscribeEvent>;
export declare namespace StreamSocketResponse {
    type Raw = SubscribeEvent.Raw;
}
