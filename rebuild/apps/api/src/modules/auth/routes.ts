import type { FastifyInstance } from "fastify";
import { authMeResponseSchema, authSessionSchema, signOutResponseSchema } from "@ryxen/contracts";
import {
  loadCurrentUser,
  requireAuthenticatedUser,
  signCompatibleToken,
  toPublicUser,
} from "../../lib/auth";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: requireAuthenticatedUser }, async (request, reply) => {
    const user = await loadCurrentUser(request.authUser!.userId);
    if (!user) {
      return reply.status(404).send({ error: "Usuario nao encontrado" });
    }

    return authMeResponseSchema.parse({
      user: toPublicUser(user),
    });
  });

  app.post("/refresh", { preHandler: requireAuthenticatedUser }, async (request, reply) => {
    const user = await loadCurrentUser(request.authUser!.userId);
    if (!user) {
      return reply.status(401).send({ error: "Usuario nao encontrado" });
    }

    return authSessionSchema.parse({
      token: await signCompatibleToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        isAdmin: !!user.is_admin,
      }),
      user: toPublicUser(user),
      trustedDevice: null,
    });
  });

  app.post("/signout", { preHandler: requireAuthenticatedUser }, async () =>
    signOutResponseSchema.parse({
      success: true,
    }),
  );
}
