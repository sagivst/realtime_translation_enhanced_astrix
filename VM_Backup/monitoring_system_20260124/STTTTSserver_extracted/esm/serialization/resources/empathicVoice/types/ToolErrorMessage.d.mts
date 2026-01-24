import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ErrorLevel } from "./ErrorLevel.mjs";
import { ToolType } from "./ToolType.mjs";
export declare const ToolErrorMessage: core.serialization.ObjectSchema<serializers.empathicVoice.ToolErrorMessage.Raw, Hume.empathicVoice.ToolErrorMessage>;
export declare namespace ToolErrorMessage {
    interface Raw {
        code?: string | null;
        content?: string | null;
        custom_session_id?: string | null;
        error: string;
        level?: ErrorLevel.Raw | null;
        tool_call_id: string;
        tool_type?: ToolType.Raw | null;
        type: "tool_error";
    }
}
