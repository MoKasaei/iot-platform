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



export async function getDeviceState(
    req: Request,
    res: Response
){

    try {

        const {
            deviceId
        } = req.params;


        const device =
            await Device.findOne({
                deviceId
            });


        if(!device){

            return res.status(404).json({
                success:false,
                error:"Device not found"
            });

        }


        return res.json({

            success:true,

            device:{
                deviceId: device.deviceId,
                name: device.name,
                online: device.online,
                state: device.state,
                lastSeen: device.lastSeen,
                lastCommand: device.lastCommand
            }

        });


    } catch(error){

        console.error(
            "Get device state failed:",
            error
        );


        return res.status(500).json({
            success:false,
            error:"Internal server error"
        });

    }

}