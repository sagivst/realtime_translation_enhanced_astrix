import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ToolType } from "./ToolType.mjs";
export declare const ToolCallMessage: core.serialization.ObjectSchema<serializers.empathicVoice.ToolCallMessage.Raw, Hume.empathicVoice.ToolCallMessage>;
export declare namespace ToolCallMessage {
    interface Raw {
        custom_session_id?: string | null;
        name: string;
        parameters: string;
        response_required: boolean;
        tool_call_id: string;
        tool_type: ToolType.Raw;
        type: "tool_call";
    }
}
