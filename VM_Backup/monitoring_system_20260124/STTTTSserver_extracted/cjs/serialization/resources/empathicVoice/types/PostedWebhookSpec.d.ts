import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { PostedWebhookEventType } from "./PostedWebhookEventType.js";
export declare const PostedWebhookSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedWebhookSpec.Raw, Hume.empathicVoice.PostedWebhookSpec>;
export declare namespace PostedWebhookSpec {
    interface Raw {
        events: PostedWebhookEventType.Raw[];
        url: string;
    }
}
