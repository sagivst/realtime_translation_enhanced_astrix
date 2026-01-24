import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnWebhookEventType } from "./ReturnWebhookEventType.js";
export declare const ReturnWebhookSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnWebhookSpec.Raw, Hume.empathicVoice.ReturnWebhookSpec>;
export declare namespace ReturnWebhookSpec {
    interface Raw {
        events: ReturnWebhookEventType.Raw[];
        url: string;
    }
}
