import { sql } from "drizzle-orm";
import {
  bigint,
  integer,
  jsonb,
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
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
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("websites_org_slug_uq").on(table.organizationId, table.slug),
    uniqueIndex("websites_org_id_id_uq").on(table.organizationId, table.id),
    uniqueIndex("websites_published_slug_uq").on(table.slug).where(sql`status = 'published'`),
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
    websiteId: uuid("website_id").notNull(),
    title: text("title").notNull(),
    path: text("path").notNull(),
    status: text("status").notNull().default("draft"),
    content: text("content").notNull().default(""),
    publishedContent: text("published_content"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "website_pages_website_org_fk",
      columns: [table.organizationId, table.websiteId],
      foreignColumns: [websites.organizationId, websites.id],
    }).onDelete("cascade"),
    uniqueIndex("website_pages_org_website_path_uq").on(
      table.organizationId,
      table.websiteId,
      table.path,
    ),
    index("website_pages_org_website_idx").on(table.organizationId, table.websiteId),
  ],
);


export const websiteDomains = pgTable(
  "website_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    websiteId: uuid("website_id").notNull(),
    hostname: text("hostname").notNull(),
    domainType: text("domain_type").notNull(),
    status: text("status").notNull().default("pending"),
    isPrimary: boolean("is_primary").notNull().default(false),
    verificationTokenHash: text("verification_token_hash"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "website_domains_website_org_fk",
      columns: [table.organizationId, table.websiteId],
      foreignColumns: [websites.organizationId, websites.id],
    }).onDelete("cascade"),
    uniqueIndex("website_domains_hostname_uq").on(table.hostname),
    uniqueIndex("website_domains_one_lucia_subdomain_per_site_uq")
      .on(table.organizationId, table.websiteId)
      .where(sql`domain_type = 'lucia_subdomain' AND status <> 'removed'`),
    uniqueIndex("website_domains_one_primary_per_site_uq")
      .on(table.organizationId, table.websiteId)
      .where(sql`is_primary = true AND status <> 'removed'`),
    index("website_domains_org_status_idx").on(table.organizationId, table.status),
    index("website_domains_active_hostname_idx").on(table.hostname)
      .where(sql`status = 'active'`),
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


/** Platform staff access is independent of organisation membership. */
export const staffGrants = pgTable(
  "platform_staff_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    grantedByUserId: uuid("granted_by_user_id").references(() => appUsers.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("platform_staff_grants_user_role_uq").on(table.userId, table.role),
    index("platform_staff_grants_user_status_idx").on(table.userId, table.status),
  ],
);

/** Support cases are tenant-scoped; staff access is separately authorized and audited. */
export const supportCases = pgTable(
  "support_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    assignedStaffUserId: uuid("assigned_staff_user_id").references(() => appUsers.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    category: text("category").notNull().default("general"),
    priority: text("priority").notNull().default("normal"),
    status: text("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("support_cases_org_id_id_uq").on(table.organizationId, table.id),
    index("support_cases_org_status_updated_idx").on(table.organizationId, table.status, table.updatedAt),
    index("support_cases_assignee_status_idx").on(table.assignedStaffUserId, table.status),
  ],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    caseId: uuid("case_id").notNull(),
    authorUserId: uuid("author_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    authorKind: text("author_kind").notNull(),
    visibility: text("visibility").notNull().default("customer"),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "support_messages_case_org_fk",
      columns: [table.organizationId, table.caseId],
      foreignColumns: [supportCases.organizationId, supportCases.id],
    }).onDelete("restrict"),
    index("support_messages_case_created_idx").on(table.organizationId, table.caseId, table.createdAt),
  ],
);

export const platformAuditEvents = pgTable(
  "platform_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    actorKind: text("actor_kind").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    purpose: text("purpose"),
    result: text("result").notNull(),
    requestId: text("request_id"),
    metadata: text("metadata"),
    createdAt: createdAt(),
  },
  (table) => [
    index("platform_audit_events_org_created_idx").on(table.organizationId, table.createdAt),
    index("platform_audit_events_actor_created_idx").on(table.actorUserId, table.createdAt),
    index("platform_audit_events_action_created_idx").on(table.action, table.createdAt),
  ],
);


/** Durable, tenant-scoped website draft checkpoints. Snapshot contains validated JSON only. */
export const websiteVersions = pgTable("website_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  websiteId: uuid("website_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
  label: text("label").notNull(),
  notes: text("notes").notNull().default(""),
  snapshot: text("snapshot").notNull(),
  createdAt: createdAt(),
}, (table) => [
  foreignKey({ name: "website_versions_website_org_fk", columns: [table.organizationId, table.websiteId], foreignColumns: [websites.organizationId, websites.id] }).onDelete("cascade"),
  uniqueIndex("website_versions_org_id_id_uq").on(table.organizationId, table.id),
  index("website_versions_org_website_created_idx").on(table.organizationId, table.websiteId, table.createdAt),
]);


/** Durable, tenant-scoped page/navigation structure, separate from published content and editor drafts. */
export const websiteStructures = pgTable("website_structures", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  websiteId: uuid("website_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
  structure: text("structure").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  foreignKey({ name: "website_structures_website_org_fk", columns: [table.organizationId, table.websiteId], foreignColumns: [websites.organizationId, websites.id] }).onDelete("cascade"),
  uniqueIndex("website_structures_org_website_uq").on(table.organizationId, table.websiteId),
  uniqueIndex("website_structures_org_id_id_uq").on(table.organizationId, table.id),
]);


/** Tenant-scoped blog drafts and media references. Media source is a URL/storage key, not uploaded bytes. */
export const websiteContentLibraries = pgTable("website_content_libraries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  websiteId: uuid("website_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
  library: text("library").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  foreignKey({ name: "website_content_libraries_website_org_fk", columns: [table.organizationId, table.websiteId], foreignColumns: [websites.organizationId, websites.id] }).onDelete("cascade"),
  uniqueIndex("website_content_libraries_org_website_uq").on(table.organizationId, table.websiteId),
  uniqueIndex("website_content_libraries_org_id_id_uq").on(table.organizationId, table.id),
]);

/** Tenant-scoped SEO/social metadata; public output must consume it only through the publishing path. */
export const websiteSeoSettings = pgTable("website_seo_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  websiteId: uuid("website_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
  settings: text("settings").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  foreignKey({ name: "website_seo_settings_website_org_fk", columns: [table.organizationId, table.websiteId], foreignColumns: [websites.organizationId, websites.id] }).onDelete("cascade"),
  uniqueIndex("website_seo_settings_org_website_uq").on(table.organizationId, table.websiteId),
  uniqueIndex("website_seo_settings_org_id_id_uq").on(table.organizationId, table.id),
]);

/** Account-owned presentation preferences, never authentication or permissions. */
export const workspacePreferences = pgTable("workspace_preferences", {
 userId: uuid("user_id").primaryKey().references(()=>appUsers.id,{onDelete:"cascade"}),
 preferences: jsonb("preferences").$type<import("@/lib/workspace/preferences").WorkspacePreferences>().notNull(),
 revision: integer("revision").notNull().default(1),
 updatedAt: updatedAt(),
});

/** Private customer media; immutable object identity and tenant/project ownership. */
export const websiteMedia = pgTable("website_media", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  websiteId: uuid("website_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
  objectKey: text("object_key").notNull(),
  lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
  bytes: integer("bytes").notNull(),
  width: integer("width").notNull(), height: integer("height").notNull(),
  alt: text("alt").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [
  foreignKey({ name: "website_media_website_org_fk", columns: [table.organizationId, table.websiteId], foreignColumns: [websites.organizationId, websites.id] }).onDelete("restrict"),
  uniqueIndex("website_media_key_uq").on(table.objectKey),
  uniqueIndex("website_media_org_website_id_uq").on(table.organizationId,table.websiteId,table.id),
  index("website_media_owner_idx").on(table.organizationId, table.websiteId, table.status),
]);
export const mediaStorageBudget = pgTable("media_storage_budget", {
  product: text("product").primaryKey(),
  reservedBytes: bigint("reserved_bytes", { mode: "number" }).notNull().default(0),
});
export const websiteMediaLimits = pgTable("website_media_limits", {
  websiteId: uuid("website_id").primaryKey().references(() => websites.id, { onDelete: "restrict" }),
  quotaBytes: integer("quota_bytes").notNull(),
});


/** Phase 15: normalized Blog/News records. Public delivery only consumes publishedSnapshot. */
export const websitePosts = pgTable("website_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  websiteId: uuid("website_id").notNull(),
  authorUserId: uuid("author_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
  kind: text("kind").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""),
  category: text("category").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  featuredMediaId: uuid("featured_media_id"),
  status: text("status").notNull().default("draft"),
  revision: integer("revision").notNull().default(1),
  publishedSnapshot: jsonb("published_snapshot").$type<import("@/lib/content/article-model").PublishedArticle | null>(),
  publishedSlug: text("published_slug"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  foreignKey({ name: "website_posts_website_org_fk", columns: [table.organizationId,table.websiteId], foreignColumns: [websites.organizationId,websites.id] }).onDelete("cascade"),
  foreignKey({ name: "website_posts_featured_media_fk", columns: [table.organizationId,table.websiteId,table.featuredMediaId], foreignColumns: [websiteMedia.organizationId,websiteMedia.websiteId,websiteMedia.id] }).onDelete("restrict"),
  uniqueIndex("website_posts_site_slug_uq").on(table.organizationId,table.websiteId,table.kind,table.slug),
  uniqueIndex("website_posts_public_slug_uq").on(table.organizationId,table.websiteId,table.kind,table.publishedSlug),
  index("website_posts_owner_idx").on(table.organizationId,table.websiteId,table.updatedAt),
]);

export const websitePostRevisions = pgTable("website_post_revisions", {
 id: uuid("id").primaryKey().defaultRandom(),
 organizationId: uuid("organization_id").notNull(),
 websiteId: uuid("website_id").notNull(),
 postId: uuid("post_id").notNull().references(() => websitePosts.id, { onDelete: "cascade" }),
 actorUserId: uuid("actor_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
 revision: integer("revision").notNull(),
 event: text("event").notNull(),
 snapshot: jsonb("snapshot").notNull(),
 createdAt: createdAt(),
}, (table) => [
 foreignKey({ name: "website_post_revisions_website_org_fk", columns: [table.organizationId,table.websiteId], foreignColumns: [websites.organizationId,websites.id] }).onDelete("cascade"),
 uniqueIndex("website_post_revisions_unique").on(table.postId,table.revision),
]);
