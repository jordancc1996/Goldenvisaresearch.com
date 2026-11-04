import { formResult } from "./form-response.ts";

export const inquirySuccess = "Thank you for your interest. Your inquiry has been received.";
export const inquiryFailure = "We couldn't submit your inquiry. Please try again.";
export const inquiryUnconfigured = "This inquiry form is not configured. No message is sent.";

export function inquiryOutcome(input: {
  endpoint: string;
  status?: number;
  payload?: unknown;
  thrown?: boolean;
}): { outcome: "success" | "error"; message: string } {
  if (!input.endpoint) return { outcome: "error", message: inquiryUnconfigured };
  if (input.thrown || formResult(input.status ?? 0, input.payload) !== "success") {
    return { outcome: "error", message: inquiryFailure };
  }
  return { outcome: "success", message: inquirySuccess };
}
