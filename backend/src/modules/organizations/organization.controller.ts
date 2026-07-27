import { Request, Response } from "express";

import Organization from "./organization.model";
import { AuthRequest } from "../../middleware/auth.middleware";

export async function getOrganizations(
    req: Request,
    res: Response
) {

    const organizations =
        await Organization.find();

    res.json(organizations);

}

export async function getCurrentOrganization(req: AuthRequest, res: Response) {
    const organization = await Organization.findOne({ organizationId: req.user!.organizationId })
        .select("organizationId name code logo");
    if (!organization) return res.status(404).json({ success: false, error: "Organization not found" });
    return res.json({ success: true, organization });
}

export async function getPublicOrganization(_req: Request, res: Response) {
    const organization = await Organization.findOne({
        organizationId: process.env.ADMIN_ORGANIZATION_ID || "ORG001",
        active: true
    }).select("name logo");
    return res.json({
        success: true,
        organization: organization || { name: "your organization" }
    });
}

export async function updateCurrentOrganization(req: AuthRequest, res: Response) {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const code = typeof req.body.code === "string" ? req.body.code.trim().toUpperCase() : "";
    const logo = req.body.logo;
    if (!name || name.length > 120 || !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code) ||
        !(logo === undefined || logo === "" ||
          (typeof logo === "string" && logo.length <= 350_000 &&
           /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(logo)))) {
        return res.status(400).json({ success: false, error: "Enter a valid organization name and logo under 250 KB" });
    }
    const organization = await Organization.findOneAndUpdate(
        { organizationId: req.user!.organizationId },
        { $set: { name, code, logo: logo || null } },
        { new: true }
    ).select("organizationId name code logo");
    return res.json({ success: true, organization });
}
