import Alarm from "./alarm.model";

const normalValues = new Set(["", "0", "false", "none", "ok", "normal", "null", "undefined"]);

function activeValue(value: unknown) {
    if (value === null || value === undefined || value === false || value === 0) return false;
    return !normalValues.has(String(value).trim().toLowerCase());
}

function flatten(code: string, value: unknown): Array<{ code: string; value: string }> {
    if (Array.isArray(value)) {
        return value.filter(activeValue).map(entry => ({ code, value: String(entry) }));
    }
    if (value && typeof value === "object") {
        return Object.entries(value)
            .filter(([, entry]) => activeValue(entry))
            .map(([entryCode, entry]) => ({ code: `${code}.${entryCode}`, value: String(entry) }));
    }
    return activeValue(value) ? [{ code, value: String(value) }] : [];
}

export async function syncTelemetryAlarms(input: {
    organizationId: string;
    deviceId: string;
    ownerUserId?: string;
    data: Record<string, unknown>;
}) {
    const alarmEntries = Object.entries(input.data)
        .filter(([key]) => /(error|fault|alarm)/i.test(key));

    for (const [rootCode, rawValue] of alarmEntries) {
        const active = flatten(rootCode, rawValue);
        const activeCodes = active.map(entry => entry.code);
        await Alarm.updateMany(
            {
                organizationId: input.organizationId,
                deviceId: input.deviceId,
                resolvedAt: { $exists: false },
                $and: [
                    { code: { $regex: `^${rootCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\.|$)` } },
                    ...(activeCodes.length ? [{ code: { $nin: activeCodes } }] : [])
                ]
            },
            { $set: { resolvedAt: new Date() } }
        );

        for (const entry of active) {
            const existing = await Alarm.findOne({
                organizationId: input.organizationId,
                deviceId: input.deviceId,
                code: entry.code,
                value: entry.value,
                resolvedAt: { $exists: false }
            });
            if (existing) {
                existing.ownerUserId = input.ownerUserId;
                await existing.save();
                continue;
            }
            await Alarm.updateMany(
                {
                    organizationId: input.organizationId,
                    deviceId: input.deviceId,
                    code: entry.code,
                    resolvedAt: { $exists: false }
                },
                { $set: { resolvedAt: new Date() } }
            );
            await Alarm.create({
                organizationId: input.organizationId,
                deviceId: input.deviceId,
                ownerUserId: input.ownerUserId,
                code: entry.code,
                value: entry.value,
                message: `${entry.code}: ${entry.value}`
            });
        }
    }
}
