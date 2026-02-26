import { z } from "zod";

const createSchema = z.object({
  fullName: z
    .string({ required_error: "Full name is required" })
    .min(1, "Full name cannot be empty"),
  phoneNumber: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  fullName: z.string().min(1, "Full name cannot be empty").optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  notes: z.string().optional(),
});

export const clientValidation = {
  createSchema,
  updateSchema,
};
