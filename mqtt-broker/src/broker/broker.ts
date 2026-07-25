import { createServer } from "node:net";
import { Aedes } from "aedes";
import { authenticate } from "../auth/authenticate";


let broker: Aedes;


export async function createBroker(): Promise<void> {


    broker = await Aedes.createBroker();
    broker.authenticate = async (
    client,
    username,
    password,
    callback
    ) => {


        if (!username || !password) {

            const error = new Error(
                "Missing credentials"
            ) as Error & {
                returnCode: number
            };


            error.returnCode = 4;


            return callback(
                error,
                false
            );
        }



        const valid = await authenticate(
            username.toString(),
            password.toString()
        );



        if (valid) {

            return callback(
                null,
                true
            );

        }



        const error = new Error(
            "Invalid credentials"
        ) as Error & {
            returnCode:number
        };


        error.returnCode = 4;


        return callback(
            error,
            false
        );

    };


    const server = createServer(
        broker.handle
    );


    server.listen(1883, () => {

        console.log("==============================");
        console.log(" MQTT Broker Started");
        console.log(" Port: 1883");
        console.log("==============================");

    });


    broker.on(
        "client",
        (client) => {

            console.log(
                `Client Connected: ${client.id}`
            );

        }
    );


    broker.on(
        "clientDisconnect",
        (client) => {

            console.log(
                `Client Disconnected: ${client.id}`
            );

        }
    );


    broker.on(
        "publish",
        (
            packet,
            client
        ) => {


            if (!client)
                return;


            console.log("\nTopic:");
            console.log(packet.topic);


            console.log("Payload:");
            console.log(
                packet.payload.toString()
            );

        }
    );

}