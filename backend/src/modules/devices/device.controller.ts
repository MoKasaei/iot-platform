import { Request, Response } from "express";
import {
    setDeviceOnline,
    setDeviceOffline
} from "./device.service";


export async function deviceOnline(
    req:Request,
    res:Response
){

    await setDeviceOnline(
        req.body.deviceId
    );


    res.json({
        success:true
    });

}



export async function deviceOffline(
    req:Request,
    res:Response
){

    await setDeviceOffline(
        req.body.deviceId
    );


    res.json({
        success:true
    });

}