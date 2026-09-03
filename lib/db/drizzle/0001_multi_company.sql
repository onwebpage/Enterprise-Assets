ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "tenants" ("name")
SELECT 'Legacy tenant ' || o."id" || ': ' || o."name" FROM "organizations" o
WHERE o."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "organizations" o
SET "tenant_id" = t."id"
FROM "tenants" t
WHERE o."tenant_id" IS NULL AND t."name" = 'Legacy tenant ' || o."id" || ': ' || o."name";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_memberships" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "organization_id" integer NOT NULL,
  "branch_id" integer,
  "role_id" integer,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "organization_memberships_user_id_organization_id_unique" UNIQUE("user_id", "organization_id")
);
--> statement-breakpoint
INSERT INTO "organization_memberships" ("user_id", "organization_id", "branch_id", "role_id", "is_default")
SELECT "id", "org_id", "branch_id", "role_id", true FROM "users" WHERE "org_id" IS NOT NULL
ON CONFLICT ("user_id", "organization_id") DO NOTHING;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
