const mqtt = require("mqtt");


const ORGANIZATION_ID = process.env.ORGANIZATION_ID || "ORG001";
const DEVICE_ID = process.env.DEVICE_ID || "AHU001";
const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME || "ahu001";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "test123";
const TELEMETRY_INTERVAL_MS = Number(process.env.TELEMETRY_INTERVAL_MS || 5000);


const client = mqtt.connect(
    MQTT_URL,
    {
        clientId: DEVICE_ID + "-" + Date.now(),
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD
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
            Number((20 + Math.random() * 5).toFixed(1)),

        humidity:
            Number((40 + Math.random() * 10).toFixed(1)),

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


    // Publish frequently enough to make the history chart useful in development.
    setInterval(
        sendTelemetry,
        TELEMETRY_INTERVAL_MS
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
