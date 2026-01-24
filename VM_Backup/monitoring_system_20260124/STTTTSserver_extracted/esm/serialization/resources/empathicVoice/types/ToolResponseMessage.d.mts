import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ToolType } from "./ToolType.mjs";
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
