import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
import { SubscribeEvent } from "../../../../types/SubscribeEvent.js";
export declare const ControlPlaneSocketResponse: core.serialization.Schema<serializers.empathicVoice.ControlPlaneSocketResponse.Raw, Hume.empathicVoice.SubscribeEvent>;
export declare namespace ControlPlaneSocketResponse {
    type Raw = SubscribeEvent.Raw;
}
