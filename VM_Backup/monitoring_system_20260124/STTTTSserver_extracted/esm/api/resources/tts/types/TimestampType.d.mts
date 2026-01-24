export declare const TimestampType: {
    readonly Word: "word";
    readonly Phoneme: "phoneme";
};
export type TimestampType = (typeof TimestampType)[keyof typeof TimestampType];
