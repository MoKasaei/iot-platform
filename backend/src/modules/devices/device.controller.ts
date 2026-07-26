import { Request, Response } from "express";
import {
    setDeviceOnline,
    setDeviceOffline
} from "./device.service";
import Device from "./device.model";
import { AuthRequest } from "../../middleware/auth.middleware";
import { getCurrentWeather, getLocationName } from "./weather.service";
import DeviceType from "../device-types/device-type.model";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { generateDevicePassword } from "../../shared/utils/password";
import User from "../users/user.model";
import Telemetry from "../telemetry/telemetry.model";
import Command from "../commands/command.model";
import { deviceAccessFilter } from "./device.access";
import Alarm from "../alarms/alarm.model";

export async function listDevices(req: AuthRequest, res: Response) {
    const devices = await Device.find(deviceAccessFilter(req))
        .select("-mqtt.passwordHash")
        .sort({ name: 1 });
    const types = await DeviceType.find({
        typeId: { $in: devices.map(device => device.typeId) }
    }).select("typeId name");
    const typeNames = new Map(
        types.map(type => [type.typeId, type.name])
    );
    const owners = req.user!.role === "admin"
        ? await User.find({ userId: { $in: devices.map(device => device.ownerUserId).filter((id): id is string => Boolean(id)) } })
            .select("userId name nickname email")
        : [];
    const ownerMap = new Map(owners.map(owner => [owner.userId, owner]));

    return res.json({
        success: true,
        devices: devices.map(device => ({
            ...device.toObject(),
            typeName: typeNames.get(device.typeId) || device.typeId,
            ...(req.user!.role === "admin" ? { owner: device.ownerUserId ? ownerMap.get(device.ownerUserId) : undefined } : {})
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
                ...deviceAccessFilter(req, String(deviceId))
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
                lastCommand: device.lastCommand,
                ...(req.user!.role === "admin" ? { ownerUserId: device.ownerUserId } : {})
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
    const deviceId =
        typeof req.body.deviceId === "string"
            ? req.body.deviceId.trim().toUpperCase()
            : "";
    const ownerUserId = req.user!.role === "admin"
        ? (typeof req.body.ownerUserId === "string" && req.body.ownerUserId ? req.body.ownerUserId : undefined)
        : req.user!.userId;

    if (!name || name.length > 120 || !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(deviceId)) {
        return res.status(400).json({
            success: false,
            error: "Enter a name and a unique device ID using 3-64 letters, numbers, dashes, or underscores"
        });
    }

    const deviceType = await DeviceType.findOne({ typeId, active: true });
    if (!deviceType) {
        return res.status(400).json({
            success: false,
            error: "Select a valid device type"
        });
    }

    if (ownerUserId) {
        const owner = await User.findOne({
            userId: ownerUserId,
            organizationId: req.user!.organizationId,
            active: true
        });
        if (!owner) return res.status(400).json({ success: false, error: "Select a valid active owner" });
        const ownedCount = await Device.countDocuments({ ownerUserId, organizationId: req.user!.organizationId });
        if (owner.deviceLimit !== null && ownedCount >= owner.deviceLimit) {
            return res.status(409).json({ success: false, error: `This account has reached its ${owner.deviceLimit}-device limit` });
        }
    }
    if (await Device.exists({ deviceId })) {
        return res.status(409).json({ success: false, error: "That device ID is already registered" });
    }
    const suffix = crypto.randomBytes(5).toString("hex");
    const username = `device-${suffix}`;
    const password = generateDevicePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const device = await Device.create({
        deviceId,
        organizationId: req.user!.organizationId,
        ownerUserId,
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

    const changingOwner = req.user!.role === "admin" &&
        Object.prototype.hasOwnProperty.call(req.body, "ownerUserId");
    if (!changingOwner && (!name || name.length > 120)) {
        return res.status(400).json({
            success: false,
            error: "Device name is required and must be 120 characters or less"
        });
    }

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (changingOwner) {
        const ownerUserId = req.body.ownerUserId;
        if (ownerUserId !== null && typeof ownerUserId !== "string") {
            return res.status(400).json({ success: false, error: "Select a valid owner or unassigned" });
        }
        if (ownerUserId) {
            const owner = await User.findOne({
                userId: ownerUserId,
                organizationId: req.user!.organizationId,
                active: true
            });
            if (!owner) return res.status(400).json({ success: false, error: "Select a valid active owner" });
            const ownedCount = await Device.countDocuments({
                ownerUserId,
                organizationId: req.user!.organizationId,
                deviceId: { $ne: String(req.params.deviceId) }
            });
            if (owner.deviceLimit !== null && ownedCount >= owner.deviceLimit) {
                return res.status(409).json({ success: false, error: `This account has reached its ${owner.deviceLimit}-device limit` });
            }
            updates.ownerUserId = ownerUserId;
        } else {
            updates.ownerUserId = null;
        }
    }

    const device = await Device.findOneAndUpdate(
        {
            deviceId: String(req.params.deviceId),
            ...deviceAccessFilter(req, String(req.params.deviceId))
        },
        { $set: updates },
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

    let resolvedLabel: string | undefined;
    try {
        resolvedLabel = await getLocationName(latitude, longitude);
    } catch (error) {
        console.warn("Reverse geocoding failed:", error);
    }

    const device = await Device.findOneAndUpdate(
        {
            deviceId: String(req.params.deviceId),
            ...deviceAccessFilter(req, String(req.params.deviceId))
        },
        {
            $set: {
                location: {
                    latitude,
                    longitude,
                    ...((resolvedLabel || label)
                        ? { label: resolvedLabel || label }
                        : {})
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
            ...deviceAccessFilter(req, String(req.params.deviceId))
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

export async function deleteDevice(req: AuthRequest, res: Response) {
    const device = await Device.findOne(deviceAccessFilter(req, String(req.params.deviceId)));
    if (!device) return res.status(404).json({ success: false, error: "Device not found" });
    if (req.body?.confirmation !== device.name) {
        return res.status(400).json({ success: false, error: "Type the device name to confirm permanent deletion" });
    }
    await Promise.all([
        Telemetry.deleteMany({ organizationId: device.organizationId, deviceId: device.deviceId }),
        Command.deleteMany({ organizationId: device.organizationId, deviceId: device.deviceId }),
        Alarm.deleteMany({ organizationId: device.organizationId, deviceId: device.deviceId })
    ]);
    await device.deleteOne();
    return res.json({ success: true });
}
