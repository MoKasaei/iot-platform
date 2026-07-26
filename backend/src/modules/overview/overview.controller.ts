import { Response } from "express";
import os from "node:os";
import { statfs } from "node:fs/promises";
import { AuthRequest } from "../../middleware/auth.middleware";
import Device from "../devices/device.model";
import User from "../users/user.model";

type CpuTimes = { idle: number; total: number };

function cpuTimes(): CpuTimes {
    return os.cpus().reduce(
        (summary, cpu) => {
            const values = Object.values(cpu.times);
            return {
                idle: summary.idle + cpu.times.idle,
                total: summary.total + values.reduce((sum, value) => sum + value, 0)
            };
        },
        { idle: 0, total: 0 }
    );
}

async function cpuUsagePercent() {
    const start = cpuTimes();
    await new Promise(resolve => setTimeout(resolve, 150));
    const end = cpuTimes();
    const total = end.total - start.total;
    const idle = end.idle - start.idle;
    return total > 0 ? Math.round((1 - idle / total) * 1000) / 10 : 0;
}

function hasError(state: Record<string, unknown> | undefined) {
    if (!state) return false;
    return Object.entries(state).some(([key, value]) => {
        if (!/(error|fault|alarm)/i.test(key)) return false;
        return ![undefined, null, false, 0, "0", "", "false", "none", "ok"]
            .includes(typeof value === "string" ? value.toLowerCase() : value as never);
    });
}

function errorCodes(state: Record<string, unknown> | undefined) {
    if (!state) return [];
    return Object.entries(state).flatMap(([key, value]) => {
        if (!/(error|fault|alarm)/i.test(key)) return [];
        const normalized = typeof value === "string" ? value.toLowerCase() : value;
        if ([undefined, null, false, 0, "0", "", "false", "none", "ok"].includes(normalized as never)) {
            return [];
        }
        if (Array.isArray(value)) {
            return value.map(code => `${key}: ${String(code)}`);
        }
        if (value && typeof value === "object") {
            return Object.entries(value)
                .filter(([, entry]) => ![false, 0, "0", "", null, undefined].includes(entry as never))
                .map(([code, entry]) => `${key}.${code}: ${String(entry)}`);
        }
        return [`${key}: ${String(value)}`];
    });
}

export async function getOverview(req: AuthRequest, res: Response) {
    const organizationId = req.user!.organizationId;
    const [cpuPercent, filesystem, devices, users] = await Promise.all([
        cpuUsagePercent(),
        statfs("/"),
        Device.find({ organizationId })
            .select("deviceId name typeId online location state ownerUserId"),
        User.find({ organizationId, active: true }).select("userId name nickname role")
    ]);
    const ownerMap = new Map(users.map(user => [user.userId, user]));

    const totalMemory = os.totalmem();
    const usedMemory = totalMemory - os.freemem();
    const totalStorage = filesystem.blocks * filesystem.bsize;
    const freeStorage = filesystem.bavail * filesystem.bsize;
    const mapDevices = devices
        .filter(device =>
            device.location?.latitude !== undefined &&
            device.location?.longitude !== undefined
        )
        .map(device => ({
            deviceId: device.deviceId,
            name: device.name,
            typeId: device.typeId,
            online: device.online,
            error: hasError(device.state),
            errors: errorCodes(device.state),
            latitude: device.location!.latitude,
            longitude: device.location!.longitude,
            label: device.location!.label,
            owner: device.ownerUserId ? ownerMap.get(device.ownerUserId) : undefined
        }));

    return res.json({
        success: true,
        system: {
            cpu: { cores: os.cpus().length, usagePercent: cpuPercent },
            ram: { totalBytes: totalMemory, usedBytes: usedMemory },
            storage: {
                totalBytes: totalStorage,
                usedBytes: totalStorage - freeStorage
            },
            uptimeSeconds: os.uptime()
        },
        totals: {
            devices: devices.length,
            onlineDevices: devices.filter(device => device.online).length,
            errorDevices: devices.filter(device => hasError(device.state)).length,
            users: users.length,
            administrators: users.filter(user => user.role === "admin").length
        },
        devices: mapDevices
    });
}
