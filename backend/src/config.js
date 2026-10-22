// Read at call time so tests can set env vars before the first request.
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
};

export const TOKEN_TTL = "7d";
