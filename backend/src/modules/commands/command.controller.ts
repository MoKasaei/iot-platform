import { Request, Response } from "express";
import { sendDeviceCommand } from "./command.service";
import Command from "./command.model";


export async function sendCommand(
    req:Request,
    res:Response
){

    try {

        const deviceId = String(req.params.deviceId);

        const {
            command,
            value
        } = req.body;


        const organizationId = "ORG001";


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