CREATE TABLE IF NOT EXISTS "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"createdby" bigint,
	"uri" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items" (
	"id" text PRIMARY KEY NOT NULL,
	"createdby" bigint,
	"uri" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "keys" (
	"userid" numeric NOT NULL,
	"custodyAddress" text NOT NULL,
	"deviceid" text NOT NULL,
	"publickey" text NOT NULL,
	"encryptedprivatekey" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"rid" bigint,
	"timestamp" bigint,
	"type" integer,
	"body" text,
	"signer" text,
	"hashtype" integer,
	"hash" text,
	"sigtype" integer,
	"sig" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "response_info" (
	"id" text PRIMARY KEY NOT NULL,
	"targetmessageid" text,
	"response" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"createdby" bigint,
	"status" integer,
	"itemid" text NOT NULL,
	"channelid" text NOT NULL,
	"response" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uri_info" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"imageuri" text,
	"animationuri" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"userid" text PRIMARY KEY NOT NULL,
	"to" text,
	"recovery" text,
	"timestamp" timestamp,
	"log_addr" text,
	"block_num" numeric
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keys" ADD CONSTRAINT "keys_userid_users_userid_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "response_info" ADD CONSTRAINT "response_info_targetmessageid_submissions_id_fk" FOREIGN KEY ("targetmessageid") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
