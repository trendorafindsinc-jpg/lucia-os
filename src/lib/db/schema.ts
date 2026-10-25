import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
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


/** Public Loom community posts. Only public feed content is stored here. */
export const loomPosts = pgTable(
  "loom_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorUserId: uuid("author_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    moderationStatus: text("moderation_status").notNull().default("visible"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("loom_posts_created_idx").on(table.createdAt), index("loom_posts_author_idx").on(table.authorUserId)],
);

export const loomReplies = pgTable(
  "loom_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => loomPosts.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    moderationStatus: text("moderation_status").notNull().default("visible"),
    createdAt: createdAt(),
  },
  (table) => [index("loom_replies_post_created_idx").on(table.postId, table.createdAt), index("loom_replies_author_idx").on(table.authorUserId)],
);


/** Loom business identity verification; only authorised staff may change status to verified. */
export const loomBusinessVerifications = pgTable(
  "loom_business_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    evidenceType: text("evidence_type").notNull(),
    evidenceReference: text("evidence_reference").notNull(),
    status: text("status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("loom_business_verifications_user_uq").on(table.userId),
    index("loom_business_verifications_status_submitted_idx").on(table.status, table.submittedAt),
  ],
);


/** Public-facing Loom profile data is kept separate from the authentication identity record. */
export const loomProfiles = pgTable("loom_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  businessName: text("business_name"),
  bio: text("bio").notNull().default(""),
  website: text("website"),
  avatarUrl: text("avatar_url"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("loom_profiles_user_uq").on(table.userId)]);

/** Public community spaces owned by a Loom member. */
export const loomGroups = pgTable("loom_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  visibility: text("visibility").notNull().default("public"),
  status: text("status").notNull().default("active"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("loom_groups_slug_uq").on(table.slug),
  index("loom_groups_status_created_idx").on(table.status, table.createdAt),
]);

export const loomGroupMemberships = pgTable("loom_group_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => loomGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("loom_group_memberships_group_user_uq").on(table.groupId, table.userId),
  index("loom_group_memberships_user_status_idx").on(table.userId, table.status),
]);

export const loomConnections = pgTable("loom_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterUserId: uuid("requester_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  recipientUserId: uuid("recipient_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("loom_connections_request_recipient_uq").on(table.requesterUserId, table.recipientUserId),
  index("loom_connections_recipient_status_idx").on(table.recipientUserId, table.status),
]);

export const loomReactions = pgTable("loom_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => loomPosts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  reaction: text("reaction").notNull().default("like"),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("loom_reactions_post_user_uq").on(table.postId, table.userId),
  index("loom_reactions_post_created_idx").on(table.postId, table.createdAt),
]);

export const loomSavedPosts = pgTable("loom_saved_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => loomPosts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("loom_saved_posts_user_post_uq").on(table.userId, table.postId),
  index("loom_saved_posts_user_created_idx").on(table.userId, table.createdAt),
]);

export const loomReports = pgTable("loom_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterUserId: uuid("reporter_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("open"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  index("loom_reports_status_created_idx").on(table.status, table.createdAt),
  index("loom_reports_reporter_created_idx").on(table.reporterUserId, table.createdAt),
]);

export const loomMessages = pgTable("loom_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderUserId: uuid("sender_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  recipientUserId: uuid("recipient_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  index("loom_messages_inbox_idx").on(table.recipientUserId, table.readAt, table.createdAt),
  index("loom_messages_conversation_idx").on(table.senderUserId, table.recipientUserId, table.createdAt),
]);

export const loomNotifications = pgTable("loom_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => appUsers.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  targetId: text("target_id"),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  index("loom_notifications_user_read_created_idx").on(table.userId, table.readAt, table.createdAt),
]);

/** Loom-specific restrictions are separate from LUCIA ID and the wider OS account status. */
export const loomMemberRestrictions = pgTable("loom_member_restrictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("restricted"),
  reason: text("reason").notNull(),
  createdByStaffUserId: uuid("created_by_staff_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  liftedAt: timestamp("lifted_at", { withTimezone: true }),
  liftedByStaffUserId: uuid("lifted_by_staff_user_id").references(() => appUsers.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("loom_member_restrictions_user_uq").on(table.userId),
  index("loom_member_restrictions_status_expires_idx").on(table.status, table.expiresAt),
]);

/** Member-to-member blocks prevent unwanted Loom interactions without changing the LUCIA ID account. */
export const loomBlocks = pgTable("loom_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockerUserId: uuid("blocker_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  blockedUserId: uuid("blocked_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("loom_blocks_pair_uq").on(table.blockerUserId, table.blockedUserId),
  index("loom_blocks_blocked_created_idx").on(table.blockedUserId, table.createdAt),
  check("loom_blocks_no_self", sql`${table.blockerUserId} <> ${table.blockedUserId}`),
]);
