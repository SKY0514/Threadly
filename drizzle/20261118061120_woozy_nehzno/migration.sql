CREATE TABLE "usage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspaceId" uuid NOT NULL,
	"userId" uuid,
	"model" text NOT NULL,
	"tokens" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "total_tokens";--> statement-breakpoint
ALTER TABLE "usage_log" ADD CONSTRAINT "usage_log_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "usage_log" ADD CONSTRAINT "usage_log_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL;