import { Request, Response, NextFunction } from "express";
import { scaleGeneratorService } from "./scale-generator.service.js";
import { locateAddressSchema } from "./scale-generator.schemas.js";

export class ScaleGeneratorController {
  async locate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawPayload =
        req.method === "GET"
          ? {
              input: String(
                req.query.input || req.query.address || req.query.endereco || ""
              ),
              cityHint: req.query.cityHint ? String(req.query.cityHint) : undefined,
              stateHint: req.query.stateHint ? String(req.query.stateHint) : undefined,
              selectedLat: req.query.selectedLat
                ? Number(req.query.selectedLat)
                : undefined,
              selectedLon: req.query.selectedLon
                ? Number(req.query.selectedLon)
                : undefined,
              selectedDisplayName: req.query.selectedDisplayName
                ? String(req.query.selectedDisplayName)
                : undefined,
            }
          : req.body;

      const parsed = locateAddressSchema.parse(rawPayload);
      const result = await scaleGeneratorService.locateAndFindTransit(parsed);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const scaleGeneratorController = new ScaleGeneratorController();
