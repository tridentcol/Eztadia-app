CREATE TABLE "email_inbox_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alias_slug" text NOT NULL,
	"bank" text NOT NULL,
	"account_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent" text NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"total_income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_expense" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_savings" numeric(15, 2) DEFAULT '0' NOT NULL,
	"top_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_merchants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_summary" text,
	"ai_habits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_inbox_aliases" ADD CONSTRAINT "email_inbox_aliases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_inbox_aliases" ADD CONSTRAINT "email_inbox_aliases_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_aliases_slug" ON "email_inbox_aliases" USING btree ("alias_slug");--> statement-breakpoint
CREATE INDEX "idx_email_aliases_user" ON "email_inbox_aliases" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_intent_examples_text" ON "intent_examples" USING btree ("text");--> statement-breakpoint
CREATE INDEX "idx_intent_examples_embedding" ON "intent_examples" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_monthly_reports_user_period" ON "monthly_reports" USING btree ("user_id","period");--> statement-breakpoint
CREATE INDEX "idx_monthly_reports_user" ON "monthly_reports" USING btree ("user_id");