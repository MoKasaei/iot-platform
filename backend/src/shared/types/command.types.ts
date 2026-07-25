export interface CommandParameter {

    name: string;

    type: "number" | "boolean" | "string";

    required: boolean;

}

export interface CommandDefinition {

    id: string;

    label: string;

    parameters: CommandParameter[];

}
