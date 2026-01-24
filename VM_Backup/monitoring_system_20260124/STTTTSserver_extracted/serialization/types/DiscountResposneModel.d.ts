import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import type * as serializers from "../index";
export declare const DiscountResposneModel: core.serialization.ObjectSchema<serializers.DiscountResposneModel.Raw, ElevenLabs.DiscountResposneModel>;
export declare namespace DiscountResposneModel {
    interface Raw {
        discount_percent_off?: number | null;
        discount_amount_off?: number | null;
    }
}
