import mqtt from "mqtt";


const client = mqtt.connect(
    "mqtt://localhost:1883",
    {
        username:"backend",
        password:"backend123",
        clientId:"service-backend-command"
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