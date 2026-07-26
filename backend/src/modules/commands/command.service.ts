import mqtt from "mqtt";
import Command from "./command.model";


const client = mqtt.connect(
    "mqtt://localhost:1883",
    {
        username:"backend",
        password:"backend123",
        clientId:"service-backend-command"
    }
);



client.on("connect", () => {

    console.log(
        "Command MQTT client connected"
    );

});


client.on("error", (err)=>{

    console.error(
        "Command MQTT error",
        err
    );

});


function mqttPublish(
    topic:string,
    payload:any
):Promise<void>{

    return new Promise(
        (resolve,reject)=>{

            client.publish(
                topic,
                JSON.stringify(payload),
                {
                    qos:1
                },
                (error)=>{

                    if(error)
                        reject(error);
                    else
                        resolve();

                }
            );

        }
    );

}

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



    const topic =
        `v1/organization/${organizationId}/device/${deviceId}/command`;



    if(!client.connected){


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


        await mqttPublish(
            topic,
            {

                commandId:
                    commandRecord._id.toString(),

                ...command

            }
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