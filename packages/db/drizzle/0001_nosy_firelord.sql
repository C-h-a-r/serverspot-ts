CREATE TABLE "game_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"order_id" uuid,
	"fulfillment_id" uuid,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "game_link_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"server_id" uuid,
	"player_uuid" text NOT NULL,
	"username" text NOT NULL,
	"user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"game" text DEFAULT 'minecraft' NOT NULL,
	"api_key_hash" text NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"player_count" integer DEFAULT 0 NOT NULL,
	"max_players" integer DEFAULT 0 NOT NULL,
	"last_heartbeat" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"game" text DEFAULT 'minecraft' NOT NULL,
	"stat_key" text DEFAULT 'value' NOT NULL,
	"sort_direction" text DEFAULT 'desc' NOT NULL,
	"display_limit" integer DEFAULT 10 NOT NULL,
	"reset_schedule" text DEFAULT 'never' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"source_type" text DEFAULT 'gateway' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"player_uuid" text,
	"player_name" text NOT NULL,
	"profile_id" uuid,
	"value" numeric(16, 2) NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"previous_rank" integer,
	"delta" numeric(16, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_callbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"username" text NOT NULL,
	"player_uuid" text,
	"ip_address" text,
	"verified" boolean DEFAULT false NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"user_id" uuid,
	"username" text NOT NULL,
	"reward_type" text DEFAULT 'command' NOT NULL,
	"reward_payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_pending_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"callback_id" uuid,
	"username" text NOT NULL,
	"claim_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid,
	"name" text NOT NULL,
	"reward_type" text DEFAULT 'command' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"vote_url" text NOT NULL,
	"callback_method" text DEFAULT 'token' NOT NULL,
	"secret" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"cooldown_minutes" integer DEFAULT 1440 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"username" text NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_vote_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_commands" ADD CONSTRAINT "game_commands_server_id_game_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."game_servers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_link_codes" ADD CONSTRAINT "game_link_codes_server_id_game_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."game_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_link_codes" ADD CONSTRAINT "game_link_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_data_sources" ADD CONSTRAINT "leaderboard_data_sources_board_id_leaderboard_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."leaderboard_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_board_id_leaderboard_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."leaderboard_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_board_id_leaderboard_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."leaderboard_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_callbacks" ADD CONSTRAINT "vote_callbacks_site_id_vote_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."vote_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_claims" ADD CONSTRAINT "vote_claims_site_id_vote_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."vote_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_claims" ADD CONSTRAINT "vote_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_pending_claims" ADD CONSTRAINT "vote_pending_claims_site_id_vote_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."vote_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_pending_claims" ADD CONSTRAINT "vote_pending_claims_callback_id_vote_callbacks_id_fk" FOREIGN KEY ("callback_id") REFERENCES "public"."vote_callbacks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_rewards" ADD CONSTRAINT "vote_rewards_site_id_vote_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."vote_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_streaks" ADD CONSTRAINT "vote_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_commands_status_idx" ON "game_commands" USING btree ("status");--> statement-breakpoint
CREATE INDEX "game_commands_order_id_idx" ON "game_commands" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_link_codes_code_idx" ON "game_link_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "game_link_codes_player_uuid_idx" ON "game_link_codes" USING btree ("player_uuid");--> statement-breakpoint
CREATE UNIQUE INDEX "game_servers_slug_idx" ON "game_servers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "game_servers_status_idx" ON "game_servers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_boards_slug_idx" ON "leaderboard_boards" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "leaderboard_data_sources_board_id_idx" ON "leaderboard_data_sources" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "leaderboard_entries_board_id_idx" ON "leaderboard_entries" USING btree ("board_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_board_player_idx" ON "leaderboard_entries" USING btree ("board_id","player_name");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_board_id_idx" ON "leaderboard_snapshots" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "vote_callbacks_site_id_idx" ON "vote_callbacks" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "vote_callbacks_username_idx" ON "vote_callbacks" USING btree ("username");--> statement-breakpoint
CREATE INDEX "vote_claims_user_id_idx" ON "vote_claims" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vote_pending_claims_token_idx" ON "vote_pending_claims" USING btree ("claim_token");--> statement-breakpoint
CREATE INDEX "vote_pending_claims_username_idx" ON "vote_pending_claims" USING btree ("username");--> statement-breakpoint
CREATE INDEX "vote_rewards_site_id_idx" ON "vote_rewards" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vote_sites_slug_idx" ON "vote_sites" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "vote_streaks_username_idx" ON "vote_streaks" USING btree ("username");