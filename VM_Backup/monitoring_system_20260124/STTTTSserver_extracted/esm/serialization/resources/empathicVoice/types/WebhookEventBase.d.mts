import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const WebhookEventBase: core.serialization.ObjectSchema<serializers.empathicVoice.WebhookEventBase.Raw, Hume.empathicVoice.WebhookEventBase>;
export declare namespace WebhookEventBase {
    interface Raw {
        chat_group_id: string;
        chat_id: string;
        config_id?: string | null;
    }
}
