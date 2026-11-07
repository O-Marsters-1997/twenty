CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS core;
CREATE TABLE core."signingKey" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "publicKey" character varying NOT NULL,
  "privateKey" character varying,
  "isCurrent" boolean NOT NULL DEFAULT false,
  "revokedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "PK_signingKey_id" PRIMARY KEY ("id")
);
