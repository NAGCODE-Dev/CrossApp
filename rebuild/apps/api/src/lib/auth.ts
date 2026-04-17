import { createSecretKey } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";
import { DEV_EMAILS, JWT_SECRET } from "../config";
import { pool } from "./db";

type JwtPayload = {
  userId: number | string;
  email: string;
  name?: string | null;
  isAdmin?: boolean;
};

type DbUserRow = {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean | null;
};

const authSecret = createSecretKey(Buffer.from(JWT_SECRET, "utf8"));

export function toPublicUser(row: DbUserRow) {
  return {
    id: String(row.id),
    email: row.email,
    name: row.name || null,
    isAdmin: !!row.is_admin,
  };
}

export async function signCompatibleToken(input: {
  userId: number;
  email: string;
  name?: string | null;
  isAdmin?: boolean;
}) {
  return new SignJWT({
    userId: input.userId,
    email: input.email,
    name: input.name || null,
    isAdmin: !!input.isAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(authSecret);
}

export async function verifyCompatibleToken(token: string) {
  const verified = await jwtVerify(token, authSecret, {
    algorithms: ["HS256"],
  });

  const payload = verified.payload as JwtPayload;
  const userId = Number(payload.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Invalid user id inside token");
  }

  return {
    userId,
    email: String(payload.email || "").trim().toLowerCase(),
    name: payload.name || null,
    isAdmin: !!payload.isAdmin,
  };
}

export async function requireAuthenticatedUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = String(request.headers.authorization || "").trim();
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return reply.status(401).send({ error: "Token ausente" });
  }

  try {
    request.authUser = await verifyCompatibleToken(token);
  } catch {
    return reply.status(401).send({ error: "Token invalido" });
  }
}

export async function requireAdminUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authReply = await requireAuthenticatedUser(request, reply);
  if (authReply) return authReply;

  if (!request.authUser?.isAdmin) {
    return reply.status(403).send({ error: "Acesso restrito a administradores" });
  }
}

export function canUseDeveloperTools(user: {
  email: string;
  isAdmin: boolean;
} | null | undefined) {
  if (!user) return false;
  return user.isAdmin || DEV_EMAILS.includes(user.email.toLowerCase());
}

export async function requireAdminOrDeveloperUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authReply = await requireAuthenticatedUser(request, reply);
  if (authReply) return authReply;

  if (!canUseDeveloperTools(request.authUser)) {
    return reply.status(403).send({
      error: "Acesso restrito a administradores ou ambiente de desenvolvimento",
    });
  }
}

export async function loadCurrentUser(userId: number) {
  const result = await pool.query<DbUserRow>(
    `SELECT id, email, name, is_admin
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] || null;
}
