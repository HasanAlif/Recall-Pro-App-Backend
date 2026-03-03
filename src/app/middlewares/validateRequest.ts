import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodEffects } from "zod";

const ZOD_PRIMITIVES = [
  "ZodString",
  "ZodNumber",
  "ZodBoolean",
  "ZodEnum",
  "ZodNativeEnum",
  "ZodLiteral",
  "ZodDate",
];

const validateRequest =
  (schema: AnyZodObject | ZodEffects<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schemaShape =
        "_def" in schema && "shape" in schema._def ? schema._def.shape() : null;

      const bodyField = schemaShape?.body;
      const bodyIsObjectWrapper =
        bodyField &&
        !ZOD_PRIMITIVES.includes(bodyField._def?.typeName as string);

      const hasRequestStructure =
        schemaShape &&
        (bodyIsObjectWrapper || schemaShape.params || schemaShape.query);

      const dataToValidate = hasRequestStructure
        ? {
            body: req.body,
            params: req.params,
            query: req.query,
          }
        : req.body;

      await schema.parseAsync(dataToValidate);
      return next();
    } catch (err) {
      next(err);
    }
  };

export default validateRequest;
