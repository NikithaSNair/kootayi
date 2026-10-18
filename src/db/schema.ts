import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // 'user' | 'worker'
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const workerProfiles = pgTable("worker_profiles", {
  userId: integer("user_id").primaryKey(),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  aadhaarLast4: text("aadhaar_last4"),
  aadhaarVerified: boolean("aadhaar_verified").notNull().default(false),
  quizScore: integer("quiz_score"),
  quizPassed: boolean("quiz_passed").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  online: boolean("online").notNull().default(false),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  locationUpdatedAt: timestamp("location_updated_at"),
  ratingSum: integer("rating_sum").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // aadhaar | pcc | kseb | iti | kwa
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(), // base64
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JobService = {
  subId: string;
  name: string;
  categoryId: string;
  hours: number;
  initial: number;
  subsequent: number;
  base: number; // govt task base for the booked hours
};

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  request: text("request"),
  address: text("address").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  workerId: integer("worker_id"),
  title: text("title").notNull(),
  clusterType: text("cluster_type").notNull(), // household | trade
  services: jsonb("services").$type<JobService[]>().notNull(),
  categories: jsonb("categories").$type<string[]>().notNull(),
  status: text("status").notNull().default("searching"), // searching|assigned|in_progress|completed|cancelled
  baseAmount: doublePrecision("base_amount").notNull(), // Σ govt task bases
  radiusKm: integer("radius_km").notNull().default(5),
  discount: doublePrecision("discount").notNull().default(0), // AI bundle discount
  travelFee: doublePrecision("travel_fee").notNull().default(0), // radius-expansion travel fee
  surchargePct: integer("surcharge_pct").notNull().default(0), // legacy, unused
  pin: text("pin").notNull(),
  rating: integer("rating"),
  review: text("review"),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const extraCharges = pgTable("extra_charges", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending|approved|rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
