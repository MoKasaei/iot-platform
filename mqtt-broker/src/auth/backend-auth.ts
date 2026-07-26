import axios from "axios";
import { env } from "../config/env";



export async function authenticateDevice(
    username:string,
    password:string
){

    try {


        const response =
            await axios.post(
                `${env.backendUrl}/internal/mqtt/auth`,
                {
                    username,
                    password
                }
            );


        return response.data;


    } catch(error){


        console.error(
            "Backend MQTT auth failed",
            error
        );


        return {
            allowed:false
        };

    }

}
