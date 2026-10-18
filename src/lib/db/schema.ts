import {
  bigint,
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  sql,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/**
 * LUCIA Core remains the identity authority. coreSubjectId is the stable,
 * verified subject identifier returned by the Core integration; this table
 * is only an application-side reference and does not authenticate users.
 */
export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coreSubjectId: text("core_subject_id").notNull(),
    displayName: text("display_name"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("app_users_core_subject_id_uq").on(table.coreSubjectId)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("organizations_slug_uq").on(table.slug),
    index("organizations_status_idx").on(table.status),
  ],
);

export const memberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("organization_memberships_org_user_uq").on(table.organizationId, table.userId),
    index("organization_memberships_user_status_idx").on(table.userId, table.status),
    index("organization_memberships_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const websites = pgTable(
  "websites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("websites_org_slug_uq").on(table.organizationId, table.slug),
    index("websites_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const websitePages = pgTable(
  "website_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    path: text("path").notNull(),
    status: text("status").notNull().default("draft"),
    content: text("content").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("website_pages_org_website_path_uq").on(
      table.organizationId,
      table.websiteId,
      table.path,
    ),
    index("website_pages_org_website_idx").on(table.organizationId, table.websiteId),
  ],
);


/**
 * Product-local opaque sessions. Core remains the identity authority; this
 * table only persists the product session created after a successful Core
 * Consumer Contract exchange.
 */
export const sessions = pgTable(
  "app_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("app_sessions_token_hash_uq").on(table.tokenHash),
    index("app_sessions_user_id_idx").on(table.userId),
    index("app_sessions_expires_at_idx").on(table.expiresAt),
  ],
);


/** Tenant-scoped billing ledger. LUCIA Core remains the identity authority. */
export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    invoiceNumber: text("invoice_number").notNull(),
    amountDueMinor: bigint("amount_due_minor", { mode: "number" }).notNull(),
    amountPaidMinor: bigint("amount_paid_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("open"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("billing_invoices_org_number_uq").on(table.organizationId, table.invoiceNumber),
    uniqueIndex("billing_invoices_org_id_id_uq").on(table.organizationId, table.id),
    index("billing_invoices_org_status_created_idx").on(table.organizationId, table.status, table.createdAt),
  ],
);

export const billingPaymentAttempts = pgTable(
  "billing_payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    invoiceId: uuid("invoice_id").notNull().references(() => billingInvoices.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference").notNull(),
    providerTransactionId: text("provider_transaction_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("initialized"),
    checkoutUrl: text("checkout_url"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "billing_payment_attempts_invoice_org_fk",
      columns: [table.organizationId, table.invoiceId],
      foreignColumns: [billingInvoices.organizationId, billingInvoices.id],
    }).onDelete("restrict"),
    uniqueIndex("billing_payment_attempts_org_provider_reference_uq").on(table.organizationId, table.provider, table.providerReference),
    uniqueIndex("billing_payment_attempts_org_idempotency_uq").on(table.organizationId, table.idempotencyKey),
    uniqueIndex("billing_payment_attempts_org_id_id_uq").on(table.organizationId, table.id),
    uniqueIndex("billing_payment_attempts_provider_txn_uq")
      .on(table.provider, table.providerTransactionId)
      .where(sql`provider_transaction_id IS NOT NULL`),
    index("billing_payment_attempts_org_invoice_created_idx").on(table.organizationId, table.invoiceId, table.createdAt),
  ],
);

export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    paymentAttemptId: uuid("payment_attempt_id").notNull(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadSha256: text("payload_sha256").notNull(),
    processingStatus: text("processing_status").notNull().default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("billing_webhook_events_org_provider_event_uq").on(table.organizationId, table.provider, table.providerEventId),
    index("billing_webhook_events_org_status_received_idx").on(table.organizationId, table.processingStatus, table.receivedAt),
    foreignKey({
      name: "billing_webhook_events_attempt_org_fk",
      columns: [table.organizationId, table.paymentAttemptId],
      foreignColumns: [billingPaymentAttempts.organizationId, billingPaymentAttempts.id],
    }).onDelete("restrict"),
  ],
);
