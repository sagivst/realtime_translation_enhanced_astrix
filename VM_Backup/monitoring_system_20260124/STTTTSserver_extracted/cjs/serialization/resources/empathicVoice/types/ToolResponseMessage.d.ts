import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ToolType } from "./ToolType.js";
export declare const ToolResponseMessage: core.serialization.ObjectSchema<serializers.empathicVoice.ToolResponseMessage.Raw, Hume.empathicVoice.ToolResponseMessage>;
export declare namespace ToolResponseMessage {
    interface Raw {
        content: string;
        custom_session_id?: string | null;
        tool_call_id: string;
        tool_name?: string | null;
        tool_type?: ToolType.Raw | null;
        type: "tool_response";
    }
}
