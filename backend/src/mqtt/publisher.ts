import mqtt from "mqtt";
import { env } from "../config/env";


const client = mqtt.connect(
    env.mqttUrl,
    {
        username: env.mqttUsername,
        password: env.mqttPassword,
        clientId: env.mqttClientId,
        reconnectPeriod: 2000
    }
);


client.on(
    "connect",
    ()=>{
        console.log(
            "MQTT publisher connected"
        );
    }
);


client.on(
    "error",
    (err)=>{
        console.error(
            "MQTT publisher error",
            err
        );
    }
);

client.on(
    "reconnect",
    () => {
        console.log("MQTT publisher reconnecting");
    }
);



export function publish(
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



export function isMqttConnected(){

    return client.connected;

}
