import crypto from "crypto";


export function generateDevicePassword(){

    return crypto
        .randomBytes(12)
        .toString("hex");

}
