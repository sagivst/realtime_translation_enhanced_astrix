import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChat } from "./ReturnChat.js";
import { ReturnPagedChatsPaginationDirection } from "./ReturnPagedChatsPaginationDirection.js";
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
