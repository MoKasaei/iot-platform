import { Request, Response } from "express";
import { saveTelemetry } from "./telemetry.service";


export async function receiveTelemetry(
    req: Request,
    res: Response
){

    const {
        organizationId,
        deviceId,
        data
    } = req.body;


    await saveTelemetry(
        organizationId,
        deviceId,
        data
    );


    res.json({
        success:true
    });

}