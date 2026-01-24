import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnChat } from "./ReturnChat.mjs";
import { ReturnPagedChatsPaginationDirection } from "./ReturnPagedChatsPaginationDirection.mjs";
export declare const ReturnPagedChats: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedChats.Raw, Hume.empathicVoice.ReturnPagedChats>;
export declare namespace ReturnPagedChats {
    interface Raw {
        chats_page: ReturnChat.Raw[];
        page_number: number;
        page_size: number;
        pagination_direction: ReturnPagedChatsPaginationDirection.Raw;
        total_pages: number;
    }
}
