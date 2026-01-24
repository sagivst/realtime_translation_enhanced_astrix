import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
import { SubscribeEvent } from "../../../../types/SubscribeEvent.js";
export declare const ChatSocketResponse: core.serialization.Schema<serializers.empathicVoice.ChatSocketResponse.Raw, Hume.empathicVoice.SubscribeEvent>;
export declare namespace ChatSocketResponse {
    type Raw = SubscribeEvent.Raw;
}
