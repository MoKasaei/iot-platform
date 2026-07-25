import { Request, Response } from "express";

import Organization from "./organization.model";

export async function getOrganizations(
    req: Request,
    res: Response
) {

    const organizations =
        await Organization.find();

    res.json(organizations);

}