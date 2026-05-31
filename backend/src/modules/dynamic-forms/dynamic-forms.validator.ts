import { z } from 'zod';

const FormFieldSchema = z.object({
  fieldKey: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'dropdown', 'checkbox', 'radio', 'file', 'textarea']),
  required: z.boolean(),
  order: z.number().int().min(0),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  conditionalOn: z
    .object({
      fieldKey: z.string(),
      operator: z.enum(['eq', 'neq']),
      value: z.unknown(),
    })
    .optional(),
  visibleToRoles: z.array(z.string()).optional(),
});

export const createFormSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    module: z.string().min(1),
    fields: z.array(FormFieldSchema),
  }),
});

export const updateFormSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    module: z.string().min(1).optional(),
    fields: z.array(FormFieldSchema).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const submitFormSchema = z.object({
  body: z.object({
    entityType: z.string().min(1),
    entityPublicId: z.string().min(1),
    responses: z.record(z.unknown()),
  }),
});
