import { Request, Response } from "express";
import {
    setDeviceOnline,
    setDeviceOffline
} from "./device.service";
import Device from "./device.model";
import { AuthRequest } from "../../middleware/auth.middleware";
import { getCurrentWeather } from "./weather.service";

export async function listDevices(req: AuthRequest, res: Response) {
    const devices = await Device.find({ organizationId: req.user!.organizationId })
        .select("-mqtt.passwordHash")
        .sort({ name: 1 });
    return res.json({ success: true, devices });
}


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
    req: AuthRequest,
    res: Response
){

    try {

        const {
            deviceId
        } = req.params;


        const device =
            await Device.findOne({
                deviceId,
                organizationId: req.user!.organizationId
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
                location: device.location,
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

export async function updateDeviceLocation(
    req: AuthRequest,
    res: Response
) {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const label =
        typeof req.body.label === "string"
            ? req.body.label.trim().slice(0, 120)
            : undefined;

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return res.status(400).json({
            success: false,
            error: "Valid latitude and longitude are required"
        });
    }

    const device = await Device.findOneAndUpdate(
        {
            deviceId: String(req.params.deviceId),
            organizationId: req.user!.organizationId
        },
        {
            $set: {
                location: {
                    latitude,
                    longitude,
                    ...(label ? { label } : {})
                }
            }
        },
        { new: true }
    ).select("-mqtt.passwordHash");

    if (!device) {
        return res.status(404).json({
            success: false,
            error: "Device not found"
        });
    }

    return res.json({ success: true, device });
}

export async function getDeviceWeather(
    req: AuthRequest,
    res: Response
) {
    try {
        const device = await Device.findOne({
            deviceId: String(req.params.deviceId),
            organizationId: req.user!.organizationId
        }).select("location");

        if (!device) {
            return res.status(404).json({
                success: false,
                error: "Device not found"
            });
        }

        if (
            device.location?.latitude === undefined ||
            device.location?.longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                error: "Set the device location before requesting weather"
            });
        }

        const weather = await getCurrentWeather(
            device.location.latitude,
            device.location.longitude
        );

        return res.json({
            success: true,
            location: device.location,
            weather
        });
    } catch (error) {
        console.error("Weather lookup failed:", error);
        return res.status(502).json({
            success: false,
            error: "Current weather is temporarily unavailable"
        });
    }
}
