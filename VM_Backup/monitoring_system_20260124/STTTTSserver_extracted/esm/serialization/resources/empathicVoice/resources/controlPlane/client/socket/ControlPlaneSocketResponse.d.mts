import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
import { SubscribeEvent } from "../../../../types/SubscribeEvent.mjs";
export declare const ControlPlaneSocketResponse: core.serialization.Schema<serializers.empathicVoice.ControlPlaneSocketResponse.Raw, Hume.empathicVoice.SubscribeEvent>;
export declare namespace ControlPlaneSocketResponse {
    type Raw = SubscribeEvent.Raw;
}
