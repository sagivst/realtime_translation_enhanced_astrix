import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ToolErrorMessage } from "./ToolErrorMessage.js";
import { ToolResponseMessage } from "./ToolResponseMessage.js";
export declare const ChatMessageToolResult: core.serialization.Schema<serializers.empathicVoice.ChatMessageToolResult.Raw, Hume.empathicVoice.ChatMessageToolResult>;
export declare namespace ChatMessageToolResult {
    type Raw = ToolResponseMessage.Raw | ToolErrorMessage.Raw;
}
