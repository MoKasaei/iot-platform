import { createServer } from "node:net";
import { Aedes } from "aedes";
import {
    authenticateDevice
} from "../auth/backend-auth";
import axios from "axios";
import { env } from "../config/env";


const deviceDisconnectTimers =
    new Map<string, NodeJS.Timeout>();


const connectedDevices =
    new Set<string>();


const mqttDeviceMap =
    new Map<string, {
        deviceId: string;
        organizationId: string;
    }>();


const backendClients =
    new Set<string>();


let broker:Aedes;


const BACKEND_SERVICE_PREFIX = "service-";



export async function createBroker():Promise<void>{


    broker =
        await Aedes.createBroker();



    broker.authenticate =
    async(
        client,
        username,
        password,
        callback
    )=>{


        if(!username || !password){


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
            Backend services

            clientId:
            service-backend-command

            username:
            backend
        */

        if(
            mqttUsername ===
            env.backendUsername
            &&
            mqttPassword ===
            env.backendPassword
        ){


            backendClients.add(
                client.id
            );


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
        */


        const result =
            await authenticateDevice(
                mqttUsername,
                mqttPassword
            );



        if(result.allowed){


            mqttDeviceMap.set(
                client.id,
                {
                    deviceId: result.deviceId,
                    organizationId: result.organizationId
                }
            );


            console.log(
                "MQTT device authenticated:",
                {
                    username:mqttUsername,
                    clientId:client.id,
                    deviceId:result.deviceId
                }
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
        env.port,
        env.host,
        ()=>{

            console.log("==============================");
            console.log(" MQTT Broker Started");
            console.log(` Listening: ${env.host}:${env.port}`);
            console.log("==============================");

        }
    );






    /*
        CONNECT
    */


    broker.on(
        "client",
        async(client)=>{


            /*
                Ignore backend services
            */

            if(
                backendClients.has(client.id)
            ){

                console.log(
                    "Backend service connected:",
                    client.id
                );

                return;

            }



            const deviceId =
                mqttDeviceMap.get(client.id)?.deviceId
                ||
                client.id;



            console.log(
                "Client Connected:",
                {
                    clientId:client.id,
                    deviceId
                }
            );



            connectedDevices.add(
                deviceId
            );



            const timer =
                deviceDisconnectTimers.get(
                    deviceId
                );


            if(timer){

                clearTimeout(timer);

                deviceDisconnectTimers.delete(
                    deviceId
                );

            }



            try{


                    await axios.post(
                    `${env.backendUrl}/internal/device/online`,
                    {
                        deviceId
                    }
                );


            }catch(error){

                console.error(
                    "Device online update failed",
                    error
                );

            }


        }
    );








    /*
        DISCONNECT
    */


    broker.on(
        "clientDisconnect",
        async(client)=>{


            /*
                Ignore backend services
            */


            if(
                backendClients.has(client.id)
            ){

                backendClients.delete(
                    client.id
                );

                console.log(
                    "Backend service disconnected:",
                    client.id
                );

                return;

            }



            const deviceId =
                mqttDeviceMap.get(client.id)?.deviceId
                ||
                client.id;



            console.log(
                "Client Disconnected:",
                {
                    clientId:client.id,
                    deviceId
                }
            );



            connectedDevices.delete(
                deviceId
            );



            const timer =
                setTimeout(
                    async()=>{


                        if(
                            connectedDevices.has(deviceId)
                        ){

                            return;

                        }



                        console.log(
                            "Marking device offline:",
                            deviceId
                        );



                        try{


                            await axios.post(
                                `${env.backendUrl}/internal/device/offline`,
                                {
                                    deviceId
                                }
                            );


                        }catch(error){

                            console.error(
                                "Device offline update failed",
                                error
                            );

                        }



                    },
                    env.offlineGraceMs
                );



            deviceDisconnectTimers.set(
                deviceId,
                timer
            );



            mqttDeviceMap.delete(
                client.id
            );


        }
    );








    /*
        MQTT MESSAGE HANDLING
    */


    broker.on(
        "publish",
        async(packet,client)=>{


            if(!client)
                return;



            if(
                backendClients.has(client.id)
            ){

                return;

            }



            const topic =
                packet.topic;
            const authenticatedDevice =
                mqttDeviceMap.get(client.id);

            if(!authenticatedDevice)
                return;



            /*
                TELEMETRY
            */


            if(
                topic.includes("/telemetry")
            ){

                try{


                    const organizationId =
                        authenticatedDevice.organizationId;


                    const deviceId =
                        authenticatedDevice.deviceId;


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
                        `${env.backendUrl}/internal/telemetry`,
                        {
                            organizationId,
                            deviceId,
                            data
                        }
                    );

                    
                    await axios.post(
                        `${env.backendUrl}/internal/device/heartbeat`,
                        {
                            deviceId
                        }
                    );

                }catch(error){


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

                try{


                    const organizationId =
                        authenticatedDevice.organizationId;


                    const deviceId =
                        authenticatedDevice.deviceId;



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
                        `${env.backendUrl}/internal/command/ack`,
                        {
                            organizationId,
                            deviceId,
                            ...data
                        }
                    );



                    console.log(
                        "Command ACK forwarded successfully"
                    );


                }catch(error){


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
