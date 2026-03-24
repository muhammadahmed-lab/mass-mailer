import { serve } from "inngest/next";
import { inngest, sendBulkEmail } from "@/app/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendBulkEmail],
});
