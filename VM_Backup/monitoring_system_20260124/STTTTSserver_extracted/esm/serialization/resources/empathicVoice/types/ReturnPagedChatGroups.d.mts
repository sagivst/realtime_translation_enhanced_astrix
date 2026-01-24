import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnChatGroup } from "./ReturnChatGroup.mjs";
import { ReturnPagedChatGroupsPaginationDirection } from "./ReturnPagedChatGroupsPaginationDirection.mjs";
export declare const ReturnPagedChatGroups: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedChatGroups.Raw, Hume.empathicVoice.ReturnPagedChatGroups>;
export declare namespace ReturnPagedChatGroups {
    interface Raw {
        chat_groups_page: ReturnChatGroup.Raw[];
        page_number: number;
        page_size: number;
        pagination_direction: ReturnPagedChatGroupsPaginationDirection.Raw;
        total_pages: number;
    }
}
