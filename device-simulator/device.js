const mqtt = require("mqtt");


const ORGANIZATION_ID = "ORG001";
const DEVICE_ID = "AHU001";


const client = mqtt.connect(
    "mqtt://localhost:1883",
    {
        clientId: DEVICE_ID + "-" + Date.now(),
        username: "ahu001",
        password: "test123"
    }
);


const commandTopic =
    `v1/organization/${ORGANIZATION_ID}/device/${DEVICE_ID}/command`;


const ackTopic =
    `v1/organization/${ORGANIZATION_ID}/device/${DEVICE_ID}/command/ack`;

const telemetryTopic =
    `v1/organization/${ORGANIZATION_ID}/device/${DEVICE_ID}/telemetry`;


function sendTelemetry(){

    const telemetry = {

        temperature:
            20 + Math.random() * 5,

        humidity:
            40 + Math.random() * 10,

        uptime:
            Math.floor(
                process.uptime()
            )

    };


    client.publish(
        telemetryTopic,
        JSON.stringify(telemetry),
        {
            qos:1
        }
    );


    console.log(
        "Telemetry sent:",
        telemetry
    );

}


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

    // send immediately after boot
    sendTelemetry();


    // heartbeat every 30 seconds
    setInterval(
        sendTelemetry,
        30000
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



process.on(
    "SIGINT",
    ()=>{

        console.log(
            "Device shutting down"
        );


        client.end(
            true,
            ()=>{
                process.exit();
            }
        );

    }
);