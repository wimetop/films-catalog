const forwardedAddressPattern = /^[a-fA-F0-9:.]{1,64}$/;

export function requestRateLimitIdentity(request: Request): string | null {
  if (process.env.TRUST_PROXY_FOR_RATE_LIMIT !== "true") return null;

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwarded && forwardedAddressPattern.test(forwarded) ? forwarded : null;
}
