export function normalizeEmail(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizePhone(value: unknown) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    const prefix = trimmed.startsWith("+") ? "+" : "";
    return prefix + trimmed.replace(/\D/g, "");
}

export function validEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validPhone(value: string) {
    return /^\+?[0-9]{7,15}$/.test(value);
}
