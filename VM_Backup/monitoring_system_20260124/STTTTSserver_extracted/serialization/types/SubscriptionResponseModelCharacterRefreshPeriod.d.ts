import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import type * as serializers from "../index";
export declare const SubscriptionResponseModelCharacterRefreshPeriod: core.serialization.Schema<serializers.SubscriptionResponseModelCharacterRefreshPeriod.Raw, ElevenLabs.SubscriptionResponseModelCharacterRefreshPeriod>;
export declare namespace SubscriptionResponseModelCharacterRefreshPeriod {
    type Raw = "monthly_period" | "annual_period";
}
