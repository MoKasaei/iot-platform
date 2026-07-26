import { Request, Response } from "express";
import {
    setDeviceOnline,
    setDeviceOffline
} from "./device.service";
import Device from "./device.model";
import { AuthRequest } from "../../middleware/auth.middleware";
import { getCurrentWeather } from "./weather.service";
import DeviceType from "../device-types/device-type.model";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { generateDevicePassword } from "../../shared/utils/password";

export async function listDevices(req: AuthRequest, res: Response) {
    const devices = await Device.find({ organizationId: req.user!.organizationId })
        .select("-mqtt.passwordHash")
        .sort({ name: 1 });
    const types = await DeviceType.find({
        typeId: { $in: devices.map(device => device.typeId) }
    }).select("typeId name");
    const typeNames = new Map(
        types.map(type => [type.typeId, type.name])
    );

    return res.json({
        success: true,
        devices: devices.map(device => ({
            ...device.toObject(),
            typeName: typeNames.get(device.typeId) || device.typeId
        }))
    });
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

        const deviceType = await DeviceType.findOne({
            typeId: device.typeId
        }).select("name");

        return res.json({

            success:true,

            device:{
                deviceId: device.deviceId,
                name: device.name,
                typeId: device.typeId,
                typeName: deviceType?.name || device.typeId,
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

export async function listDeviceTypes(
    req: AuthRequest,
    res: Response
) {
    const types = await DeviceType.find({ active: true })
        .select("typeId name icon")
        .sort({ name: 1 });

    return res.json({ success: true, types });
}

export async function createDevice(
    req: AuthRequest,
    res: Response
) {
    const name =
        typeof req.body.name === "string"
            ? req.body.name.trim()
            : "";
    const typeId =
        typeof req.body.typeId === "string"
            ? req.body.typeId.trim()
            : "";

    if (!name || name.length > 120) {
        return res.status(400).json({
            success: false,
            error: "Device name is required and must be 120 characters or less"
        });
    }

    const deviceType = await DeviceType.findOne({ typeId, active: true });
    if (!deviceType) {
        return res.status(400).json({
            success: false,
            error: "Select a valid device type"
        });
    }

    const suffix = crypto.randomBytes(5).toString("hex");
    const deviceId = crypto.randomUUID();
    const username = `device-${suffix}`;
    const password = generateDevicePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const device = await Device.create({
        deviceId,
        organizationId: req.user!.organizationId,
        typeId,
        name,
        hardware:
            typeof req.body.hardware === "string"
                ? req.body.hardware.trim().slice(0, 120)
                : "unknown",
        firmwareVersion:
            typeof req.body.firmwareVersion === "string"
                ? req.body.firmwareVersion.trim().slice(0, 60)
                : "0.0.0",
        mqtt: { username, passwordHash }
    });

    return res.status(201).json({
        success: true,
        device: {
            ...device.toObject(),
            mqtt: undefined,
            typeName: deviceType.name
        },
        credentials: {
            username,
            password
        }
    });
}

export async function renameDevice(
    req: AuthRequest,
    res: Response
) {
    const name =
        typeof req.body.name === "string"
            ? req.body.name.trim()
            : "";

    if (!name || name.length > 120) {
        return res.status(400).json({
            success: false,
            error: "Device name is required and must be 120 characters or less"
        });
    }

    const device = await Device.findOneAndUpdate(
        {
            deviceId: String(req.params.deviceId),
            organizationId: req.user!.organizationId
        },
        { $set: { name } },
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
