import Telemetry from "./telemetry.model";
import Device from "../devices/device.model";


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

    await Device.updateOne(
        {
            organizationId,
            deviceId
        },
        {
            online:true,
            lastSeen:new Date(),
            state:data
        }
    );
}
