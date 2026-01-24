import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnChatEventRole: core.serialization.Schema<serializers.empathicVoice.ReturnChatEventRole.Raw, Hume.empathicVoice.ReturnChatEventRole>;
export declare namespace ReturnChatEventRole {
    type Raw = "USER" | "AGENT" | "SYSTEM" | "TOOL";
}
