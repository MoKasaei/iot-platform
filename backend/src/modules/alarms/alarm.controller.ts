import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Device from "../devices/device.model";
import Alarm from "./alarm.model";

function access(req: AuthRequest) {
    return {
        organizationId: req.user!.organizationId,
        ...(req.user!.role === "admin" ? {} : { ownerUserId: req.user!.userId }),
        dismissedBy: { $ne: req.user!.userId }
    };
}

export async function listAlarms(req: AuthRequest, res: Response) {
    const alarms = await Alarm.find(access(req)).sort({ createdAt: -1 }).limit(200);
    const devices = await Device.find({
        organizationId: req.user!.organizationId,
        deviceId: { $in: alarms.map(alarm => alarm.deviceId) }
    }).select("deviceId name");
    const names = new Map(devices.map(device => [device.deviceId, device.name]));
    return res.json({
        success: true,
        unreadCount: alarms.filter(alarm => !alarm.readBy.includes(req.user!.userId)).length,
        alarms: alarms.map(alarm => ({
            ...alarm.toObject(),
            deviceName: names.get(alarm.deviceId) || alarm.deviceId,
            read: alarm.readBy.includes(req.user!.userId)
        }))
    });
}

export async function readAlarm(req: AuthRequest, res: Response) {
    const alarm = await Alarm.findOneAndUpdate(
        { _id: req.params.alarmId, ...access(req) },
        { $addToSet: { readBy: req.user!.userId } },
        { new: true }
    );
    if (!alarm) return res.status(404).json({ success: false, error: "Alarm not found" });
    return res.json({ success: true });
}

export async function dismissAlarm(req: AuthRequest, res: Response) {
    const alarm = await Alarm.findOneAndUpdate(
        { _id: req.params.alarmId, ...access(req) },
        { $addToSet: { dismissedBy: req.user!.userId, readBy: req.user!.userId } },
        { new: true }
    );
    if (!alarm) return res.status(404).json({ success: false, error: "Alarm not found" });
    return res.json({ success: true });
}

export async function dismissAllAlarms(req: AuthRequest, res: Response) {
    const filter = access(req);
    await Alarm.updateMany(filter, {
        $addToSet: { dismissedBy: req.user!.userId, readBy: req.user!.userId }
    });
    return res.json({ success: true });
}
