import { DeviceTypeDefinition } from "../../shared/types/device-type.types";

export const AHU: DeviceTypeDefinition = {

    typeId: "AHU",

    name: "Air Handling Unit",

    icon: "air",

    telemetry: [

        {
            id: "temperature",
            label: "Temperature",
            valueType: "number",
            unit: "°C",
            decimals: 1,
            history: true,
            writable: false
        },

        {
            id: "humidity",
            label: "Humidity",
            valueType: "number",
            unit: "%",
            decimals: 1,
            history: true,
            writable: false
        },

        {
            id: "fan",
            label: "Supply Fan",
            valueType: "boolean",
            history: false,
            writable: true
        }

    ],

    commands: [

        {
            id: "START",
            label: "Start",
            parameters: []
        },

        {
            id: "STOP",
            label: "Stop",
            parameters: []
        }

    ]

};
