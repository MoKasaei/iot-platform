export type ValueType =
    | "number"
    | "boolean"
    | "string"
    | "enum";

export interface TelemetryField {

    id: string;

    label: string;

    valueType: ValueType;

    unit?: string;

    min?: number;

    max?: number;

    decimals?: number;

    history: boolean;

    writable: boolean;

}
