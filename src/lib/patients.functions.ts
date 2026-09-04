import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const claimSchema = z.object({
  mrn: z.string().trim().min(3).max(40),
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD"),
});

/**
 * Lets a signed-in patient attach their login to an existing patient record by
 * proving they know its medical record number and date of birth.
 */
export const claimPatientRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => claimSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: record, error } = await supabaseAdmin
      .from("patients")
      .select("id, user_id, date_of_birth")
      .eq("mrn", data.mrn.toUpperCase())
      .maybeSingle();

    if (error) throw new Error("Could not check that record right now.");
    if (!record || record.date_of_birth !== data.dateOfBirth) {
      return { ok: false as const, message: "No record matches that number and date of birth." };
    }
    if (record.user_id && record.user_id !== context.userId) {
      return { ok: false as const, message: "That record is already linked to another account." };
    }

    const { error: updateError } = await supabaseAdmin
      .from("patients")
      .update({ user_id: context.userId })
      .eq("id", record.id);

    if (updateError) return { ok: false as const, message: "Could not link the record." };
    return { ok: true as const, message: "Record linked to your account." };
  });
