import { Request, Response } from "express";
import {
    authenticateMQTTDevice
} from "./mqtt-auth.service";


export async function mqttAuthController(
    req: Request,
    res: Response
) {


    const {
        username,
        password
    } = req.body;



    const result =
        await authenticateMQTTDevice(
            username,
            password
        );


    res.json(result);

}
