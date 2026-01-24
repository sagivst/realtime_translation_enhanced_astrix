import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ToolErrorMessage } from "./ToolErrorMessage.mjs";
import { ToolResponseMessage } from "./ToolResponseMessage.mjs";
export declare const ChatMessageToolResult: core.serialization.Schema<serializers.empathicVoice.ChatMessageToolResult.Raw, Hume.empathicVoice.ChatMessageToolResult>;
export declare namespace ChatMessageToolResult {
    type Raw = ToolResponseMessage.Raw | ToolErrorMessage.Raw;
}
