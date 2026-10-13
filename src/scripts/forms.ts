import { formResult } from "../lib/form-response";

const forms = document.querySelectorAll<HTMLFormElement>("[data-editorial-form]");

for (const form of forms) {
  const status = form.querySelector<HTMLElement>("[data-form-status]");
  const button = form.querySelector<HTMLButtonElement>("[type=submit]");
  let sending = false;

  const show = (message: string, outcome: "error" | "success" | "pending") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.outcome = outcome;
  };

  const fieldError = (field: HTMLInputElement | HTMLTextAreaElement, message: string) => {
    const error = form.querySelector<HTMLElement>(`[data-error-for="${field.id}"]`);
    field.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) error.textContent = message;
  };

  const validate = () => {
    let valid = true;
    const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")].filter(
      (field) => field.type !== "hidden" && field.name !== "_gotcha" && !field.hidden,
    );
    for (const field of fields) {
      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        const message = field.required && !field.checked ? "Confirm this choice." : "";
        fieldError(field, message);
        if (message) valid = false;
        continue;
      }
      if (field.required && field.value.trim() === "") {
        fieldError(field, "Complete this field.");
        valid = false;
        continue;
      }
      if (field instanceof HTMLInputElement && field.type === "email" && field.value.trim() !== "" && !field.validity.valid) {
        fieldError(field, "Enter an email address.");
        valid = false;
        continue;
      }
      if (field instanceof HTMLInputElement && field.type === "url" && field.value.trim() !== "") {
        let parsed: URL | null = null;
        try {
          parsed = new URL(field.value.trim());
        } catch {
          parsed = null;
        }
        if (!parsed || parsed.protocol !== "https:" || !field.validity.valid) {
          fieldError(field, "Enter a full https address.");
          valid = false;
          continue;
        }
      }
      fieldError(field, "");
    }
    return valid;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    const honeypot = form.querySelector<HTMLInputElement>("[name=_gotcha]");
    if (honeypot?.value) {
      show("The form could not be sent.", "error");
      return;
    }
    if (!validate()) {
      show("Correct the marked fields. No message has been sent.", "error");
      const first = form.querySelector<HTMLElement>("[aria-invalid=true]");
      first?.focus();
      return;
    }
    const endpoint = form.dataset.endpoint ?? "";
    if (!endpoint) {
      show("This form is not configured. No message is sent.", "error");
      return;
    }
    sending = true;
    if (button) button.disabled = true;
    form.setAttribute("aria-busy", "true");
    show("Sending.", "pending");
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
      if (formResult(response.status, payload) === "success") {
        form.reset();
        show("The form provider accepted the message.", "success");
      } else {
        show("The form provider did not accept the message. No success is recorded.", "error");
      }
    } catch {
      show("The form could not be sent. No success is recorded.", "error");
    } finally {
      sending = false;
      if (button) button.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
}

export {};
