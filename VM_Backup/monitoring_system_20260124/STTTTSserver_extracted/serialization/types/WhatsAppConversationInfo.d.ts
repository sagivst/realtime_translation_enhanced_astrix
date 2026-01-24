import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import type * as serializers from "../index";
export declare const WhatsAppConversationInfo: core.serialization.ObjectSchema<serializers.WhatsAppConversationInfo.Raw, ElevenLabs.WhatsAppConversationInfo>;
export declare namespace WhatsAppConversationInfo {
    interface Raw {
        whatsapp_business_account_id: string;
        whatsapp_user_id: string;
    }
}
