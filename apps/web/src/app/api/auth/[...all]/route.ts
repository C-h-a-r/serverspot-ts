import { createAuth } from "@serverspot/auth/server";
import { env } from "@serverspot/config/env";
import { toNextJsHandler } from "better-auth/next-js";

const auth = createAuth(env.DATABASE_URL);

export const { GET, POST } = toNextJsHandler(auth);
