import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const WebhookEventBase: core.serialization.ObjectSchema<serializers.empathicVoice.WebhookEventBase.Raw, Hume.empathicVoice.WebhookEventBase>;
export declare namespace WebhookEventBase {
    interface Raw {
        chat_group_id: string;
        chat_id: string;
        config_id?: string | null;
    }
}
