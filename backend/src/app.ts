import express from "express";
import cors from "cors";
import helmet from "helmet";
import organizationRoutes from "./modules/organizations/organization.routes";

const app = express();


app.use(
    "/api/organizations",
    organizationRoutes
);


app.use(cors());
app.use(helmet());
app.use(express.json());


app.get("/", (req, res) => {
    res.json({
        status: "running",
        service: "IoT Platform Backend"
    });
});


export default app;
