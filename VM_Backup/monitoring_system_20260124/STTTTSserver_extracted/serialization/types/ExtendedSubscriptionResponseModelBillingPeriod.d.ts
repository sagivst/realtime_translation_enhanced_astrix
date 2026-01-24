import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import type * as serializers from "../index";
export declare const ExtendedSubscriptionResponseModelBillingPeriod: core.serialization.Schema<serializers.ExtendedSubscriptionResponseModelBillingPeriod.Raw, ElevenLabs.ExtendedSubscriptionResponseModelBillingPeriod>;
export declare namespace ExtendedSubscriptionResponseModelBillingPeriod {
    type Raw = "monthly_period" | "annual_period";
}
