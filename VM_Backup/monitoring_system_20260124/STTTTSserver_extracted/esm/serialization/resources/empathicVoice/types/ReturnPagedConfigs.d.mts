import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnConfig } from "./ReturnConfig.mjs";
export declare const ReturnPagedConfigs: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedConfigs.Raw, Hume.empathicVoice.ReturnPagedConfigs>;
export declare namespace ReturnPagedConfigs {
    interface Raw {
        configs_page?: ReturnConfig.Raw[] | null;
        page_number?: number | null;
        page_size?: number | null;
        total_pages: number;
    }
}
