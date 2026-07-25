import { TelemetryField } from "./field.types";
import { CommandDefinition } from "./command.types";

export interface DeviceTypeDefinition {

    typeId: string;

    name: string;

    icon: string;

    telemetry: TelemetryField[];

    commands: CommandDefinition[];

}
