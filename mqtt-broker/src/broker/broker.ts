import { createServer } from "node:net";
import { Aedes } from "aedes";
import {
    authenticateDevice
} from "../auth/backend-auth";
import axios from "axios";


let broker: Aedes;


const BACKEND_SERVICE_PREFIX = "service-";


export async function createBroker(): Promise<void> {


    console.log(
        "Backend MQTT user:",
        process.env.MQTT_BACKEND_USERNAME
    );


    broker = await Aedes.createBroker();


    broker.authenticate = async (
        client,
        username,
        password,
        callback
    ) => {


        if (!username || !password) {

            const error =
                new Error(
                    "Missing credentials"
                ) as Error & {
                    returnCode:number
                };


            error.returnCode = 4;


            return callback(
                error,
                false
            );
        }



        const mqttUsername =
            username.toString();


        const mqttPassword =
            password.toString();



        /*
            Backend service authentication

            Example:
            clientId: service-backend-command
            username: backend
            password: backend123
        */
        if(
            mqttUsername === process.env.MQTT_BACKEND_USERNAME &&
            mqttPassword === process.env.MQTT_BACKEND_PASSWORD
        ){

            console.log(
                "MQTT backend authenticated:",
                client.id
            );


            return callback(
                null,
                true
            );
        }



        /*
            Device authentication

            Example:
            clientId: AHU001
            username: ahu001
            password: test123
        */

        const result =
            await authenticateDevice(
                mqttUsername,
                mqttPassword
            );



        if(result.allowed) {


            console.log(
                "MQTT device authenticated:",
                mqttUsername
            );


            return callback(
                null,
                true
            );

        }



        const error =
            new Error(
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



    const server =
        createServer(
            broker.handle
        );



    server.listen(
        1883,
        () => {

            console.log("==============================");
            console.log(" MQTT Broker Started");
            console.log(" Port: 1883");
            console.log("==============================");

        }
    );



    /*
        Client connected
    */

    broker.on(
        "client",
        async(client)=>{


            console.log(
                "Client Connected:",
                client.id
            );



            /*
                Ignore backend services

                They are not IoT devices
            */
            if(
                client.id.startsWith(
                    BACKEND_SERVICE_PREFIX
                )
            ){

                return;

            }



            try {


                await axios.post(
                    "http://localhost:3000/internal/device/online",
                    {
                        deviceId:client.id
                    }
                );


            } catch(error){


                console.error(
                    "Device online update failed",
                    error
                );

            }


        }
    );



    /*
        Client disconnected
    */

    broker.on(
        "clientDisconnect",
        async(client)=>{


            console.log(
                "Client Disconnected:",
                client.id
            );



            if(
                client.id.startsWith(
                    BACKEND_SERVICE_PREFIX
                )
            ){

                return;

            }



            try {


                await axios.post(
                    "http://localhost:3000/internal/device/offline",
                    {
                        deviceId:client.id
                    }
                );


            } catch(error){


                console.error(
                    "Device offline update failed",
                    error
                );

            }


        }
    );




    /*
        MQTT messages
    */

    broker.on(
        "publish",
        async(packet, client)=>{


            if(!client)
                return;



            /*
                Ignore backend service messages

                Example:
                service-backend-command
            */

            if(
                client.id.startsWith(
                    BACKEND_SERVICE_PREFIX
                )
            ){

                return;

            }



            const topic =
                packet.topic;



            /*
                TELEMETRY
            */

            if(
                topic.includes("/telemetry")
            ){

                try {


                    const parts =
                        topic.split("/");


                    const organizationId =
                        parts[2];


                    const deviceId =
                        parts[4];



                    const data =
                        JSON.parse(
                            packet.payload.toString()
                        );



                    console.log(
                        "Forwarding telemetry",
                        {
                            organizationId,
                            deviceId,
                            data
                        }
                    );



                    await axios.post(
                        "http://localhost:3000/internal/telemetry",
                        {
                            organizationId,
                            deviceId,
                            data
                        }
                    );


                }
                catch(error){


                    console.error(
                        "Telemetry forwarding failed",
                        error
                    );

                }


                return;

            }




            /*
                COMMAND ACK
            */

            if(
                topic.includes("/command/ack")
            ){

                try {


                    const parts =
                        topic.split("/");


                    const organizationId =
                        parts[2];


                    const deviceId =
                        parts[4];



                    const data =
                        JSON.parse(
                            packet.payload.toString()
                        );



                    console.log(
                        "Command ACK received",
                        {
                            organizationId,
                            deviceId,
                            data
                        }
                    );



                    await axios.post(
                        "http://localhost:3000/internal/command/ack",
                        {
                            organizationId,
                            deviceId,
                            ...data
                        }
                    );

                    console.log("Command ACK forwarded successfully");

                }
                catch(error){


                    console.error(
                        "Command ACK forwarding failed",
                        error
                    );

                }


                return;

            }


        }
    );


}