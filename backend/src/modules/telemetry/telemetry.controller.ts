import { Request, Response } from "express";
import { saveTelemetry } from "./telemetry.service";
import Device from "../devices/device.model";
import Telemetry from "./telemetry.model";


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



        /*
            1. Save telemetry history
        */

        await Telemetry.create({

            organizationId,

            deviceId,

            data

        });



        console.log(
            "Telemetry saved:",
            {
                deviceId,
                data
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

                state:data
            }

        );



        console.log(
            "Device state updated:",
            deviceId,
            data
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
    req:Request,
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
                deviceId
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