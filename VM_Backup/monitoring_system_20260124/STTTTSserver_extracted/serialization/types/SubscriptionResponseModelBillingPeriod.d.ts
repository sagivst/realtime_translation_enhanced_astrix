import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import type * as serializers from "../index";
export declare const SubscriptionResponseModelBillingPeriod: core.serialization.Schema<serializers.SubscriptionResponseModelBillingPeriod.Raw, ElevenLabs.SubscriptionResponseModelBillingPeriod>;
export declare namespace SubscriptionResponseModelBillingPeriod {
    type Raw = "monthly_period" | "annual_period";
}
