import {publish,isMqttConnected} from "../../mqtt/publisher";
import Command from "./command.model";


export async function sendDeviceCommand(
    organizationId:string,
    deviceId:string,
    command:any,
){


    // 1. Create command record

    const commandRecord =
        await Command.create({

            organizationId,

            deviceId,

            command,

            status:"pending"

        });



    const isParameterCommand =
        command.command === "set_parameter" &&
        command.value &&
        typeof command.value.key === "string";
    const topic = isParameterCommand
        ? `iotdashboard/devices/${deviceId}/commands`
        : `v1/organization/${organizationId}/device/${deviceId}/command`;
    const payload = isParameterCommand
        ? { [command.value.key]: command.value.value }
        : {
            commandId: commandRecord._id.toString(),
            ...command
        };



    if(!isMqttConnected()) {

        await Command.updateOne(
            {
                _id:commandRecord._id
            },
            {
                status:"failed"
            }
        );


        console.log(
            "MQTT client not connected"
        );


        return commandRecord;

    }




    // 2. Publish MQTT command

    try {


        await publish(
            topic,
            payload
        );


    }
    catch(error){


        await Command.updateOne(
            {
                _id:commandRecord._id
            },
            {
                status:"failed"
            }
        );


        console.error(
            "MQTT publish failed",
            error
        );


        return commandRecord;

    }




    // 3. Update status

    await Command.updateOne(

        {
            _id:commandRecord._id
        },

        {
            status:"sent",
            sentAt:new Date()
        }

    );



    console.log(
        "Command sent:",
        topic,
        command
    );


    return commandRecord;

}


export async function acknowledgeCommand(
    commandId:string,
    result:any
){

    await Command.updateOne(
        {
            _id:commandId
        },
        {
            status:"completed",
            acknowledgedAt:new Date(),
            result
        }
    );


    console.log(
        "Command completed:",
        commandId
    );

}
