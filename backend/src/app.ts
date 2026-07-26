import express from "express";
import cors from "cors";
import helmet from "helmet";

import organizationRoutes from "./modules/organizations/organization.routes";
import mqttAuthRoutes from "./modules/mqtt-auth/mqtt-auth.routes";
import telemetryRoutes from "./modules/telemetry/telemetry.routes";
import deviceRoutes, {
    internalDeviceRouter
} from "./modules/devices/device.routes";
import commandRoutes from "./modules/commands/command.routes";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import overviewRoutes from "./modules/overview/overview.routes";


const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "400kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/overview", overviewRoutes);


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
    "/api/devices",
    deviceRoutes
);

app.use(
    "/internal/device",
    internalDeviceRouter
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
