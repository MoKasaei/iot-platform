import "dotenv/config";
import { createBroker } from "./broker/broker";


async function start(){

    await createBroker();

}


start();