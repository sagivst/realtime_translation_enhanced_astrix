export interface CustomModelPrediction {
    output: Record<string, number>;
    error: string;
    taskType: string;
}
