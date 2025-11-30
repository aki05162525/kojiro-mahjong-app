ALTER TABLE "scores" ALTER COLUMN "final_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "score_pt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "rank" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "rank_pt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "total_pt" DROP NOT NULL;