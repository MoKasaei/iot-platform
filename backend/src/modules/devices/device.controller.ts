import { Request, Response } from "express";
import {
    setDeviceOnline,
    setDeviceOffline
} from "./device.service";
import Device from "./device.model";


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


export async function deviceHeartbeat(
    req:any,
    res:any
){

    const {
        deviceId
    } = req.body;


    await Device.updateOne(
        {
            deviceId
        },
        {
            online:true,
            lastSeen:new Date()
        }
    );


    res.json({
        success:true
    });

}