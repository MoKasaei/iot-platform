import bcrypt from "bcrypt";
import Device from "../devices/device.model";


export async function authenticateMQTTDevice(
    username: string,
    password: string
) {


    const device = await Device.findOne({
        "mqtt.username": username
    });


    if (!device) {

        return {
            allowed: false
        };

    }


    const valid =
        await bcrypt.compare(
            password,
            device.mqtt.passwordHash
        );


    if (!valid) {

        return {
            allowed: false
        };

    }


    return {

        allowed: true,

        deviceId: device.deviceId,

        organizationId:
            device.organizationId

    };

}
