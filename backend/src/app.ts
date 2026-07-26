import express from "express";
import cors from "cors";
import helmet from "helmet";

import organizationRoutes from "./modules/organizations/organization.routes";
import mqttAuthRoutes from "./modules/mqtt-auth/mqtt-auth.routes";
import telemetryRoutes from "./modules/telemetry/telemetry.routes";
import deviceRoutes from "./modules/devices/device.routes";
import commandRoutes from "./modules/commands/command.routes";


const app = express();


app.use(cors());
app.use(helmet());
app.use(express.json());


app.use(
    "/api/organizations",
    organizationRoutes
);


app.use(
    "/internal/mqtt",
    mqttAuthRoutes
);


app.use(
    telemetryRoutes
);


app.use(
    deviceRoutes
);


// Device command API
app.use(
    "/api/devices",
    commandRoutes
);


// Internal MQTT callbacks
app.use(
    "/internal/command",
    commandRoutes
);


app.get("/", (req, res) => {

    res.json({
        status:"running",
        service:"IoT Platform Backend"
    });

});


export default app;