ALTER TYPE "public"."league_status" ADD VALUE 'deleted';--> statement-breakpoint
DROP TABLE "league_members" CASCADE;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "role" "user_role";