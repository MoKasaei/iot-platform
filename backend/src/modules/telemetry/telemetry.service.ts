import Telemetry from "./telemetry.model";


export async function saveTelemetry(
    organizationId:string,
    deviceId:string,
    data:any
){

    return await Telemetry.create({

        organizationId,

        deviceId,

        data

    });

}