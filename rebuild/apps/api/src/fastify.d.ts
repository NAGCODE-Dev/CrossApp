import "fastify";

export type AuthenticatedRequestUser = {
  userId: number;
  email: string;
  name: string | null;
  isAdmin: boolean;
};

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthenticatedRequestUser | null;
  }
}
