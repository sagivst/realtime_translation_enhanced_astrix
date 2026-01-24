import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import type * as serializers from "../index";
export declare const PendingSubscriptionSwitchResponseModelNextBillingPeriod: core.serialization.Schema<serializers.PendingSubscriptionSwitchResponseModelNextBillingPeriod.Raw, ElevenLabs.PendingSubscriptionSwitchResponseModelNextBillingPeriod>;
export declare namespace PendingSubscriptionSwitchResponseModelNextBillingPeriod {
    type Raw = "monthly_period" | "annual_period";
}
