import { Request, Response } from "express";
import { saveTelemetry } from "./telemetry.service";
import Device from "../devices/device.model";
import Telemetry from "./telemetry.model";
import { AuthRequest } from "../../middleware/auth.middleware";
import { deviceAccessFilter } from "../devices/device.access";

const legacyStatusKeys = [
    "TempSet", "WinSum", "Eco", "Spk", "AutoManual", "Fan1", "Fan2",
    "Night", "PumpONOFF", "NormalTroque", "DischargeTime", "CoilTemp",
    "StageStatus", "TimerONOFF", "TimerSet", "SystemONOFF", "TurboONOFF"
];

function normalizeTelemetry(value: unknown): unknown {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            return null;
        }
        return Math.round(value * 10) / 10;
    }

    if (
        typeof value === "string" &&
        value.trim() !== "" &&
        /^-?\d+(\.\d+)?$/.test(value.trim())
    ) {
        return Math.round(Number(value) * 10) / 10;
    }

    if (Array.isArray(value)) {
        return value.map(normalizeTelemetry);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                normalizeTelemetry(entry)
            ])
        );
    }

    return value;
}

export async function receiveTelemetry(
    req:Request,
    res:Response
){

    try {

        const {
            organizationId,
            deviceId,
            data
        } = req.body;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                error: "Telemetry data must be an object"
            });
        }
        const normalizedPayload =
            normalizeTelemetry(data) as Record<string, unknown>;
        const normalizedData = Object.fromEntries(
            Object.entries(normalizedPayload).map(([key, value]) => {
                const legacyMatch = /^statuse(\d+)$/i.exec(key);
                const mappedKey = legacyMatch
                    ? legacyStatusKeys[Number(legacyMatch[1]) - 1] || key
                    : key;
                return [mappedKey, value];
            })
        );
        const stateUpdates = Object.fromEntries(
            Object.entries(normalizedData).map(([key, value]) => [
                `state.${key}`,
                value
            ])
        );



        /*
            1. Save telemetry history
        */

        await Telemetry.create({

            organizationId,

            deviceId,

            data: normalizedData

        });



        console.log(
            "Telemetry saved:",
            {
                deviceId,
                data: normalizedData
            }
        );



        /*
            2. Update device live state
        */

        await Device.updateOne(

            {
                deviceId
            },

            {
                $set: {
                    online: true,
                    lastSeen: new Date(),
                    ...stateUpdates
                }
            }

        );



        console.log(
            "Device state updated:",
            deviceId,
            normalizedData
        );



        return res.json({

            success:true

        });



    } catch(error){


        console.error(
            "Telemetry error:",
            error
        );


        return res.status(500).json({

            success:false

        });

    }

}



export async function getTelemetry(
    req:AuthRequest,
    res:Response
){

    try {

        const {
            deviceId
        } = req.params;


        const limit =
            Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

        const allowed = await Device.exists(deviceAccessFilter(req, String(deviceId)));
        if (!allowed) {
            return res.status(404).json({ success: false, error: "Device not found" });
        }

        const data =
            await Telemetry.find({
                deviceId,
                organizationId: req.user!.organizationId
            })
            .sort({
                timestamp:-1
            })
            .limit(limit);



        return res.json({

            success:true,

            telemetry:data.reverse()

        });


    } catch(error){

        console.error(error);

        return res.status(500).json({
            success:false
        });

    }

}
