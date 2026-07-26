import aedes from "aedes";
import net from "net";
import { env } from "../config/env";


const broker = aedes();


const server = net.createServer(
    broker.handle
);


export function startMQTTBroker() {

    server.listen(
        env.mqttPort,
        () => {

            console.log(
                `MQTT broker running on port ${env.mqttPort}`
            );

        }
    );


}


broker.on("client", (client) => {

    console.log(
        `MQTT client connected: ${client.id}`
    );

});


broker.on("clientDisconnect", (client) => {

    console.log(
        `MQTT client disconnected: ${client.id}`
    );

});


broker.on("publish", (packet, client) => {

    if(client) {

        console.log(
            "MQTT message:",
            packet.topic
        );

    }

});
