import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import * as serializers from "../index";
import { ConversationHistoryTranscriptOtherToolsResultCommonModel } from "./ConversationHistoryTranscriptOtherToolsResultCommonModel";
import { ConversationHistoryTranscriptSystemToolResultCommonModel } from "./ConversationHistoryTranscriptSystemToolResultCommonModel";
export declare const WorkflowToolNestedToolsStepModelOutputResultsItem: core.serialization.Schema<serializers.WorkflowToolNestedToolsStepModelOutputResultsItem.Raw, ElevenLabs.WorkflowToolNestedToolsStepModelOutputResultsItem>;
export declare namespace WorkflowToolNestedToolsStepModelOutputResultsItem {
    type Raw = ConversationHistoryTranscriptOtherToolsResultCommonModel.Raw | ConversationHistoryTranscriptSystemToolResultCommonModel.Raw | serializers.ConversationHistoryTranscriptWorkflowToolsResultCommonModelOutput.Raw;
}
