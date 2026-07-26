const mqtt = require("mqtt");


const ORGANIZATION_ID = "ORG001";
const DEVICE_ID = "AHU001";


const client = mqtt.connect(
    "mqtt://localhost:1883",
    {
        clientId: DEVICE_ID,
        username: "ahu001",
        password: "test123"
    }
);


const commandTopic =
    `v1/organization/${ORGANIZATION_ID}/device/${DEVICE_ID}/command`;


const ackTopic =
    `v1/organization/${ORGANIZATION_ID}/device/${DEVICE_ID}/command/ack`;



client.on("connect", () => {

    console.log("Device connected");


    client.subscribe(
        commandTopic,
        {
            qos:1
        },
        (err)=>{

            if(err)
                console.error(err);
            else
                console.log(
                    "Subscribed:",
                    commandTopic
                );

        }
    );

});



client.on(
    "message",
    (topic,message)=>{


        console.log(
            "Command received:",
            topic,
            message.toString()
        );


        const command =
            JSON.parse(
                message.toString()
            );


        // simulate executing command

        if(
            command.command === "set_temperature"
        ){

            const temperature =
                command.value;


            console.log(
                "Setting temperature:",
                temperature
            );


            const ack = {
                organizationId:
                    ORGANIZATION_ID,

                deviceId:
                    DEVICE_ID,

                commandId:
                    command.commandId,

                status:
                    "completed",

                result:{
                    temperature
                }

            };


            client.publish(
                ackTopic,
                JSON.stringify(ack),
                {
                    qos:1
                }
            );


            console.log(
                "ACK sent:",
                ack
            );

        }

    }
);



client.on(
    "error",
    err=>{
        console.error(
            "MQTT error",
            err
        );
    }
);
