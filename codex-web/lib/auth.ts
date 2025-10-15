export type AuthMethod = "subscription" | "api-key";

export interface SubscriptionSession {
  method: "subscription";
  email: string;
  verifiedAt: string;
}

export interface ApiKeySession {
  method: "api-key";
  apiKey: string;
  capturedAt: string;
}

export type AuthSession = SubscriptionSession | ApiKeySession;

export function maskApiKey(key: string) {
  if (!key) {
    return "";
  }
  if (key.length <= 4) {
    return "*".repeat(Math.max(0, key.length));
  }
  return key.replace(/.(?=.{4})/g, "*");
}
