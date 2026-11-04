import { linkedInProfileUrl } from "../data/inquiry-programs.ts";
import { inquiryOutcome } from "../lib/inquiry-outcome.ts";

const forms = document.querySelectorAll<HTMLFormElement>("[data-inquiry-form]");

for (const form of forms) {
  const status = form.querySelector<HTMLElement>("[data-form-status]");
  const button = form.querySelector<HTMLButtonElement>("[type=submit]");
  let sending = false;
  let sent = false;

  const show = (message: string, outcome: "error" | "success") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.outcome = outcome;
  };

  const fieldError = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, message: string) => {
    const error = form.querySelector<HTMLElement>(`[data-error-for="${field.id}"]`);
    field.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) error.textContent = message;
  };

  const validate = () => {
    let valid = true;
    const fields = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")].filter(
      (field) => field.type !== "hidden" && field.name !== "_gotcha",
    );
    for (const field of fields) {
      const value = field.value.trim();
      if (field.required && value === "") {
        fieldError(field, field instanceof HTMLSelectElement ? "Select a program." : "Complete this field.");
        valid = false;
        continue;
      }
      if (field instanceof HTMLInputElement && field.type === "email" && value !== "" && !field.validity.valid) {
        fieldError(field, "Enter an email address.");
        valid = false;
        continue;
      }
      if (field instanceof HTMLInputElement && field.name === "linkedin" && value !== "" && !linkedInProfileUrl(value)) {
        fieldError(field, "Enter a LinkedIn profile URL.");
        valid = false;
        continue;
      }
      fieldError(field, "");
    }
    return valid;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending || sent) return;
    const honeypot = form.querySelector<HTMLInputElement>("[name=_gotcha]");
    if (honeypot?.value) {
      show("We couldn't submit your inquiry. Please try again.", "error");
      return;
    }
    if (!validate()) {
      show("Correct the marked fields. No message has been sent.", "error");
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    const articleUrl = form.querySelector<HTMLInputElement>("[name=article_url]");
    if (articleUrl) articleUrl.value = `${location.origin}${location.pathname}`;
    const articleTitle = form.querySelector<HTMLInputElement>("[name=article_title]");
    if (articleTitle && articleTitle.value.trim() === "") {
      articleTitle.value = document.querySelector("h1")?.textContent?.trim() ?? "";
    }
    const endpoint = form.dataset.endpoint ?? "";
    if (!endpoint) {
      const result = inquiryOutcome({ endpoint: "" });
      show(result.message, result.outcome);
      return;
    }
    sending = true;
    if (button) button.disabled = true;
    form.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const result = inquiryOutcome({ endpoint, status: response.status, payload });
      show(result.message, result.outcome);
      if (result.outcome === "success") {
        sent = true;
        if (button) button.disabled = true;
      } else if (button) button.disabled = false;
    } catch {
      const result = inquiryOutcome({ endpoint, thrown: true });
      show(result.message, result.outcome);
      if (button) button.disabled = false;
    } finally {
      sending = false;
      form.removeAttribute("aria-busy");
    }
  });
}

export {};
