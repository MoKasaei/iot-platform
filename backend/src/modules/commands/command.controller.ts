import { Request, Response } from "express";
import { sendDeviceCommand } from "./command.service";
import Command from "./command.model";
import { AuthRequest } from "../../middleware/auth.middleware";
import Device from "../devices/device.model";
import { deviceAccessFilter } from "../devices/device.access";


export async function sendCommand(
    req:AuthRequest,
    res:Response
){

    try {

        const deviceId = String(req.params.deviceId);

        const {
            command,
            value
        } = req.body;

        if (command === "set_parameter") {
            const allowedParameters = new Set([
                "TempSet", "Eco", "AutoManual", "Fan1", "Fan2", "Night",
                "PumpONOFF", "TimerONOFF", "TimerSet", "SystemONOFF",
                "TurboONOFF"
            ]);
            if (
                !value ||
                typeof value.key !== "string" ||
                !allowedParameters.has(value.key)
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid writable device parameter"
                });
            }
        }


        const organizationId = req.user!.organizationId;

        const deviceExists = await Device.exists(deviceAccessFilter(req, deviceId));
        if (!deviceExists) {
            return res.status(404).json({ success: false, error: "Device not found" });
        }


        const result =
            await sendDeviceCommand(
                organizationId,
                deviceId,
                {
                    command,
                    value
                }
            );


        return res.json({

            success:true,

            commandId:result._id

        });


    } catch(error) {


        console.error(
            "Command failed:",
            error
        );


        return res.status(500).json({

            success:false,

            error:"Command failed"

        });

    }

}


export async function commandAck(
    req:any,
    res:any
){

    try {

        const {
            organizationId,
            deviceId,
            commandId,
            status,
            result
        } = req.body;



        const updated =
            await Command.updateOne(

                {
                    _id:commandId,
                    organizationId,
                    deviceId
                },

                {

                    status,

                    result,

                    acknowledgedAt:
                        new Date()

                }

            );



        if(updated.matchedCount === 0){

            return res.status(404).json({

                success:false,

                error:"Command not found"

            });

        }



        return res.json({

            success:true

        });


    }
    catch(error){


        console.error(
            "Command ACK failed:",
            error
        );


        return res.status(500).json({

            success:false

        });

    }

}
