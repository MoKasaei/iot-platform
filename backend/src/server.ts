import app from "./app";

import { env } from "./config/env";

import { connectMongoDB } from "./database/mongodb";

import { seedOrganization } from "./modules/organizations/organization.service";

import { seedDeviceTypes } from "./modules/device-types/device-type.service";

import { seedDevices } from "./modules/devices/device.service";

import { startMQTTBroker } from "./mqtt/broker";

async function start() {

    await connectMongoDB();

    await seedOrganization();

    await seedDeviceTypes();

    await seedDevices();


    startMQTTBroker();

    app.listen(env.port, () => {

        console.log(`Server listening on ${env.port}`);

    });

}

start();