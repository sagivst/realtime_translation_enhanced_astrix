import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import type * as serializers from "../index";
import { ConversationHistoryTranscriptToolCallCommonModelToolDetails } from "./ConversationHistoryTranscriptToolCallCommonModelToolDetails";
import { ToolType } from "./ToolType";
export declare const ConversationHistoryTranscriptToolCallCommonModel: core.serialization.ObjectSchema<serializers.ConversationHistoryTranscriptToolCallCommonModel.Raw, ElevenLabs.ConversationHistoryTranscriptToolCallCommonModel>;
export declare namespace ConversationHistoryTranscriptToolCallCommonModel {
    interface Raw {
        type?: ToolType.Raw | null;
        request_id: string;
        tool_name: string;
        params_as_json: string;
        tool_has_been_called: boolean;
        tool_details?: ConversationHistoryTranscriptToolCallCommonModelToolDetails.Raw | null;
    }
}
