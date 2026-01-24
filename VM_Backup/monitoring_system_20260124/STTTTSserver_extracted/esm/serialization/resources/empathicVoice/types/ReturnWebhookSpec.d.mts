import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnWebhookEventType } from "./ReturnWebhookEventType.mjs";
export declare const ReturnWebhookSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnWebhookSpec.Raw, Hume.empathicVoice.ReturnWebhookSpec>;
export declare namespace ReturnWebhookSpec {
    interface Raw {
        events: ReturnWebhookEventType.Raw[];
        url: string;
    }
}
