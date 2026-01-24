import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
import { SubscribeEvent } from "../../../../types/SubscribeEvent.mjs";
export declare const ChatSocketResponse: core.serialization.Schema<serializers.empathicVoice.ChatSocketResponse.Raw, Hume.empathicVoice.SubscribeEvent>;
export declare namespace ChatSocketResponse {
    type Raw = SubscribeEvent.Raw;
}
