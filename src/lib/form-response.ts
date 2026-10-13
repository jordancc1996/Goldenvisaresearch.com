export type FormOutcome = "success" | "error";

export function formResult(status: number, payload: unknown): FormOutcome {
  if (status < 200 || status >= 300) return "error";
  if (!payload || typeof payload !== "object") return "error";
  if ("ok" in payload && payload.ok === true) return "success";
  return "error";
}
