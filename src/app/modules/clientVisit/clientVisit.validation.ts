import { z } from "zod";

const createSchema = z.object({
  clientId: z
    .string({ required_error: "Client ID is required" })
    .min(1, "Client ID cannot be empty"),
  serviceType: z.string().optional(),
  serviceNotes: z.string().optional(),
  personalNotes: z.string().optional(),
  duration: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  date: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }),
  servicePrice: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  tips: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
});

const updateSchema = z.object({
  serviceType: z.string().optional(),
  serviceNotes: z.string().optional(),
  personalNotes: z.string().optional(),
  duration: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  date: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }),
  servicePrice: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  tips: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
});

export const clientVisitValidation = {
  createSchema,
  updateSchema,
};
