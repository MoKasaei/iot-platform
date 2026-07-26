import Telemetry from "./telemetry.model";


export async function saveTelemetry(
    organizationId: string,
    deviceId: string,
    data: Record<string, unknown>
) {


    return await Telemetry.create({

        organizationId,

        deviceId,

        data

    });

}
