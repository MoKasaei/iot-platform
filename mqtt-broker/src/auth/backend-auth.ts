import axios from "axios";


const BACKEND_URL =
    process.env.BACKEND_URL ||
    "http://localhost:3000";


export async function authenticateDevice(
    username: string,
    password: string
) {


    try {

        const response =
            await axios.post(
                `${BACKEND_URL}/internal/mqtt/auth`,
                {
                    username,
                    password
                }
            );


        return response.data;


    } catch(error) {


        console.error(
            "Backend MQTT auth failed",
            error
        );


        return {
            allowed:false
        };

    }

}
