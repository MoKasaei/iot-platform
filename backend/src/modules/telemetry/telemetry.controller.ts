import { Request, Response } from "express";
import { saveTelemetry } from "./telemetry.service";
import Device from "../devices/device.model";


export async function receiveTelemetry(
    req:Request,
    res:Response
){

    try {

        const {
            organizationId,
            deviceId,
            data
        } = req.body;


        await Device.updateOne(
            {
                deviceId
            },
            {
                online:true,
                lastSeen:new Date(),
                state:data
            }
        );


        console.log(
            "Device state updated:",
            deviceId,
            data
        );


        res.json({
            success:true
        });


    } catch(error){

        console.error(
            "Telemetry error:",
            error
        );


        res.status(500).json({
            success:false
        });

    }

}