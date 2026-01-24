import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnChatEventRole: core.serialization.Schema<serializers.empathicVoice.ReturnChatEventRole.Raw, Hume.empathicVoice.ReturnChatEventRole>;
export declare namespace ReturnChatEventRole {
    type Raw = "USER" | "AGENT" | "SYSTEM" | "TOOL";
}
