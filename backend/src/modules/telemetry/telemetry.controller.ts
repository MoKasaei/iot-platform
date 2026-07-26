import { Request, Response } from "express";
import { saveTelemetry } from "./telemetry.service";
import Device from "../devices/device.model";
import Telemetry from "./telemetry.model";
import { AuthRequest } from "../../middleware/auth.middleware";

function normalizeTelemetry(value: unknown): unknown {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            return null;
        }
        return Math.round(value * 10) / 10;
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
        const normalizedData =
            normalizeTelemetry(data) as Record<string, unknown>;



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
                online:true,

                lastSeen:new Date(),

                state: normalizedData
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
            Number(req.query.limit) || 100;



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
