import { Router } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);
const MODULE = "Advanced CRM";

const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().min(0);

const leadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(300).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  source: z.enum(["website", "referral", "cold_call", "email", "social_media", "event", "partner", "other"]).default("website"),
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).default("new"),
  assignedTo: z.string().max(200).nullable().optional(),
  expectedValue: money.default(0),
  notes: z.string().max(2000).nullable().optional(),
});

const opportunitySchema = z.object({
  leadId: id.nullable().optional(),
  name: z.string().min(1).max(300),
  company: z.string().min(1).max(300),
  contactName: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  stage: z.enum(["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]).default("prospecting"),
  amount: money.default(0),
  probability: z.coerce.number().int().min(0).max(100).default(10),
  expectedCloseDate: date.nullable().optional(),
  assignedTo: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const quotationItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: money.default(1),
  unitPrice: money.default(0),
});

const quotationSchema = z.object({
  opportunityId: id.nullable().optional(),
  leadId: id.nullable().optional(),
  customerName: z.string().min(1).max(300),
  customerEmail: z.string().email().nullable().optional(),
  customerPhone: z.string().max(50).nullable().optional(),
  quotationDate: date,
  validUntil: date.nullable().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).default("draft"),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(quotationItemSchema).optional(),
});

const activitySchema = z.object({
  leadId: id.nullable().optional(),
  opportunityId: id.nullable().optional(),
  activityType: z.enum(["call", "email", "meeting", "task", "note", "follow_up"]).default("note"),
  subject: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  activityDate: date,
  dueDate: date.nullable().optional(),
  completed: z.boolean().default(false),
  assignedTo: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const communicationSchema = z.object({
  leadId: id.nullable().optional(),
  opportunityId: id.nullable().optional(),
  communicationType: z.enum(["email", "phone", "meeting", "chat", "letter"]).default("email"),
  subject: z.string().min(1).max(300),
  body: z.string().max(5000).nullable().optional(),
  communicationDate: date,
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
  contactName: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const targetSchema = z.object({
  salesperson: z.string().min(1).max(200),
  period: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  periodStart: date,
  periodEnd: date,
  targetAmount: money.default(0),
  achievedAmount: money.default(0),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
  notes: z.string().max(1000).nullable().optional(),
});

function org(req: AuthRequest) { return req.user!.orgId!; }
function parsedId(value: string) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function fail(res: any, message: string, status = 400) { res.status(status).json({ success: false, error: message }); }
async function nextNumber(table: string, prefix: string, orgId: number, client: any = pool) {
  const allowed = new Set(["crm_leads", "crm_opportunities", "crm_quotations", "crm_sales_targets"]);
  if (!allowed.has(table)) throw new Error("invalid number table");
  const result = await client.query(`select count(*)::int as count from ${table} where org_id=$1`, [orgId]);
  return `${prefix}-${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(4, "0")}`;
}

// ── Summary ────────────────────────────────────────────────────────────────────
router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const o = org(req);
    const [leads, newLeads, qualifiedLeads, opportunities, openOpps, wonOpps, pipelineValue, quotations, sentQuotes, activities, pendingActivities, communications, targets, activeTargets] = await Promise.all([
      pool.query(`select count(*)::int as count from crm_leads where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from crm_leads where org_id=$1 and status='new'`, [o]),
      pool.query(`select count(*)::int as count from crm_leads where org_id=$1 and status='qualified'`, [o]),
      pool.query(`select count(*)::int as count from crm_opportunities where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from crm_opportunities where org_id=$1 and stage not in ('closed_won','closed_lost')`, [o]),
      pool.query(`select count(*)::int as count from crm_opportunities where org_id=$1 and stage='closed_won'`, [o]),
      pool.query(`select coalesce(sum(amount),0)::numeric as total from crm_opportunities where org_id=$1 and stage not in ('closed_won','closed_lost')`, [o]),
      pool.query(`select count(*)::int as count from crm_quotations where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from crm_quotations where org_id=$1 and status='sent'`, [o]),
      pool.query(`select count(*)::int as count from crm_activities where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from crm_activities where org_id=$1 and completed=false`, [o]),
      pool.query(`select count(*)::int as count from crm_communications where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from crm_sales_targets where org_id=$1`, [o]),
      pool.query(`select count(*)::int as count from crm_sales_targets where org_id=$1 and status='active'`, [o]),
    ]);
    res.json({ success: true, data: {
      totalLeads: leads.rows[0].count,
      newLeads: newLeads.rows[0].count,
      qualifiedLeads: qualifiedLeads.rows[0].count,
      totalOpportunities: opportunities.rows[0].count,
      openOpportunities: openOpps.rows[0].count,
      wonOpportunities: wonOpps.rows[0].count,
      pipelineValue: pipelineValue.rows[0].total,
      totalQuotations: quotations.rows[0].count,
      sentQuotations: sentQuotes.rows[0].count,
      totalActivities: activities.rows[0].count,
      pendingActivities: pendingActivities.rows[0].count,
      totalCommunications: communications.rows[0].count,
      totalTargets: targets.rows[0].count,
      activeTargets: activeTargets.rows[0].count,
    }});
  } catch { fail(res, "Failed to load CRM summary", 500); }
});

// ── Leads ─────────────────────────────────────────────────────────────────────
router.get("/leads", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select l.*,
        (select count(*)::int from crm_activities a where a.lead_id=l.id) as activity_count,
        (select count(*)::int from crm_communications c where c.lead_id=l.id) as communication_count
       from crm_leads l where l.org_id=$1 order by l.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load leads", 500); }
});

router.post("/leads", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = leadSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = await nextNumber("crm_leads", "LD", o, client);
    const r = await client.query(
      `insert into crm_leads(org_id,lead_number,first_name,last_name,company,title,email,phone,source,status,assigned_to,expected_value,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
      [o, number, d.firstName, d.lastName, d.company ?? null, d.title ?? null, d.email ?? null, d.phone ?? null, d.source, d.status, d.assignedTo ?? null, d.expectedValue, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, "Failed to create lead", 500); }
  finally { client.release(); }
});

router.put("/leads/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const leadId = parsedId(req.params.id as string); if (!leadId) return fail(res, "Invalid id");
  const parsed = leadSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update crm_leads set first_name=coalesce($1,first_name),last_name=coalesce($2,last_name),company=coalesce($3,company),title=coalesce($4,title),email=coalesce($5,email),phone=coalesce($6,phone),source=coalesce($7,source),status=coalesce($8,status),assigned_to=coalesce($9,assigned_to),expected_value=coalesce($10,expected_value),notes=coalesce($11,notes),updated_at=now() where id=$12 and org_id=$13 returning *`,
      [d.firstName ?? null, d.lastName ?? null, d.company ?? null, d.title ?? null, d.email ?? null, d.phone ?? null, d.source ?? null, d.status ?? null, d.assignedTo ?? null, d.expectedValue ?? null, d.notes ?? null, leadId, org(req)]);
    if (!r.rows[0]) return fail(res, "Lead not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update lead", 500); }
});

router.post("/leads/:id/convert", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const leadId = parsedId(req.params.id as string); if (!leadId) return fail(res, "Invalid id");
  const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const lead = await client.query(`select * from crm_leads where id=$1 and org_id=$2 for update`, [leadId, o]);
    if (!lead.rows[0]) throw new Error("Lead not found");
    if (lead.rows[0].status === "converted") throw new Error("Lead is already converted");
    const oppNumber = await nextNumber("crm_opportunities", "OPP", o, client);
    const opp = await client.query(
      `insert into crm_opportunities(org_id,opportunity_number,lead_id,name,company,contact_name,contact_email,contact_phone,stage,amount,probability,assigned_to,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [o, oppNumber, leadId, `${lead.rows[0].first_name} ${lead.rows[0].last_name} - ${lead.rows[0].company ?? "Lead"}`, lead.rows[0].company ?? "Unknown", `${lead.rows[0].first_name} ${lead.rows[0].last_name}`, lead.rows[0].email, lead.rows[0].phone, "qualification", lead.rows[0].expected_value, 20, lead.rows[0].assigned_to, req.user!.userId]);
    await client.query(`update crm_leads set status='converted',updated_at=now() where id=$1`, [leadId]);
    await client.query("commit");
    res.json({ success: true, data: opp.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Lead not found" || e.message === "Lead is already converted" ? e.message : "Failed to convert lead", e.message === "Lead not found" ? 404 : 409); }
  finally { client.release(); }
});

router.delete("/leads/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const leadId = parsedId(req.params.id as string); if (!leadId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from crm_leads where id=$1 and org_id=$2 returning id`, [leadId, org(req)]);
    if (!r.rows[0]) return fail(res, "Lead not found", 404);
    res.json({ success: true, data: { id: leadId } });
  } catch { fail(res, "Failed to delete lead", 500); }
});

// ── Opportunities ─────────────────────────────────────────────────────────────
router.get("/opportunities", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select o.*,
        (select count(*)::int from crm_activities a where a.opportunity_id=o.id) as activity_count,
        (select count(*)::int from crm_quotations q where q.opportunity_id=o.id) as quotation_count
       from crm_opportunities o where o.org_id=$1 order by o.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load opportunities", 500); }
});

router.post("/opportunities", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = opportunitySchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = await nextNumber("crm_opportunities", "OPP", o, client);
    const r = await client.query(
      `insert into crm_opportunities(org_id,opportunity_number,lead_id,name,company,contact_name,contact_email,contact_phone,stage,amount,probability,expected_close_date,assigned_to,description,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *`,
      [o, number, d.leadId ?? null, d.name, d.company, d.contactName ?? null, d.contactEmail ?? null, d.contactPhone ?? null, d.stage, d.amount, d.probability, d.expectedCloseDate ?? null, d.assignedTo ?? null, d.description ?? null, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, "Failed to create opportunity", 500); }
  finally { client.release(); }
});

router.put("/opportunities/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const oppId = parsedId(req.params.id as string); if (!oppId) return fail(res, "Invalid id");
  const parsed = opportunitySchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update crm_opportunities set lead_id=coalesce($1,lead_id),name=coalesce($2,name),company=coalesce($3,company),contact_name=coalesce($4,contact_name),contact_email=coalesce($5,contact_email),contact_phone=coalesce($6,contact_phone),stage=coalesce($7,stage),amount=coalesce($8,amount),probability=coalesce($9,probability),expected_close_date=coalesce($10,expected_close_date),assigned_to=coalesce($11,assigned_to),description=coalesce($12,description),notes=coalesce($13,notes),updated_at=now() where id=$14 and org_id=$15 returning *`,
      [d.leadId ?? null, d.name ?? null, d.company ?? null, d.contactName ?? null, d.contactEmail ?? null, d.contactPhone ?? null, d.stage ?? null, d.amount ?? null, d.probability ?? null, d.expectedCloseDate ?? null, d.assignedTo ?? null, d.description ?? null, d.notes ?? null, oppId, org(req)]);
    if (!r.rows[0]) return fail(res, "Opportunity not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update opportunity", 500); }
});

router.delete("/opportunities/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const oppId = parsedId(req.params.id as string); if (!oppId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from crm_opportunities where id=$1 and org_id=$2 returning id`, [oppId, org(req)]);
    if (!r.rows[0]) return fail(res, "Opportunity not found", 404);
    res.json({ success: true, data: { id: oppId } });
  } catch { fail(res, "Failed to delete opportunity", 500); }
});

// ── Quotations ────────────────────────────────────────────────────────────────
router.get("/quotations", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select q.*,
        (select count(*)::int from crm_quotation_items i where i.quotation_id=q.id) as item_count
       from crm_quotations q where q.org_id=$1 order by q.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load quotations", 500); }
});

router.post("/quotations", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = quotationSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = await nextNumber("crm_quotations", "QT", o, client);
    const subtotal = (d.items ?? []).reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const taxAmount = subtotal * 0.1;
    const totalAmount = subtotal + taxAmount;
    const head = await client.query(
      `insert into crm_quotations(org_id,quotation_number,opportunity_id,lead_id,customer_name,customer_email,customer_phone,quotation_date,valid_until,subtotal,tax_amount,total_amount,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`,
      [o, number, d.opportunityId ?? null, d.leadId ?? null, d.customerName, d.customerEmail ?? null, d.customerPhone ?? null, d.quotationDate, d.validUntil ?? null, subtotal, taxAmount, totalAmount, d.status, d.notes ?? null, req.user!.userId]);
    for (const item of d.items ?? []) {
      await client.query(
        `insert into crm_quotation_items(org_id,quotation_id,description,quantity,unit_price,line_total) values($1,$2,$3,$4,$5,$6)`,
        [o, head.rows[0].id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice]);
    }
    await client.query("commit");
    res.status(201).json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, "Failed to create quotation", 500); }
  finally { client.release(); }
});

router.put("/quotations/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const quoteId = parsedId(req.params.id as string); if (!quoteId) return fail(res, "Invalid id");
  const parsed = quotationSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const existing = await client.query(`select * from crm_quotations where id=$1 and org_id=$2 for update`, [quoteId, o]);
    if (!existing.rows[0]) throw new Error("Quotation not found");
    const subtotal = d.items ? (d.items ?? []).reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0) : Number(existing.rows[0].subtotal || 0);
    const taxAmount = subtotal * 0.1;
    const totalAmount = subtotal + taxAmount;
    const head = await client.query(
      `update crm_quotations set opportunity_id=coalesce($1,opportunity_id),lead_id=coalesce($2,lead_id),customer_name=coalesce($3,customer_name),customer_email=coalesce($4,customer_email),customer_phone=coalesce($5,customer_phone),quotation_date=coalesce($6,quotation_date),valid_until=coalesce($7,valid_until),subtotal=$8,tax_amount=$9,total_amount=$10,status=coalesce($11,status),notes=coalesce($12,notes),updated_at=now() where id=$13 and org_id=$14 returning *`,
      [d.opportunityId ?? null, d.leadId ?? null, d.customerName ?? null, d.customerEmail ?? null, d.customerPhone ?? null, d.quotationDate ?? null, d.validUntil ?? null, subtotal, taxAmount, totalAmount, d.status ?? null, d.notes ?? null, quoteId, o]);
    if (d.items) {
      await client.query(`delete from crm_quotation_items where quotation_id=$1`, [quoteId]);
      for (const item of d.items) {
        await client.query(
          `insert into crm_quotation_items(org_id,quotation_id,description,quantity,unit_price,line_total) values($1,$2,$3,$4,$5,$6)`,
          [o, quoteId, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice]);
      }
    }
    await client.query("commit");
    res.json({ success: true, data: head.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, e.message === "Quotation not found" ? e.message : "Failed to update quotation", e.message === "Quotation not found" ? 404 : 500); }
  finally { client.release(); }
});

router.delete("/quotations/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const quoteId = parsedId(req.params.id as string); if (!quoteId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from crm_quotations where id=$1 and org_id=$2 returning id`, [quoteId, org(req)]);
    if (!r.rows[0]) return fail(res, "Quotation not found", 404);
    res.json({ success: true, data: { id: quoteId } });
  } catch { fail(res, "Failed to delete quotation", 500); }
});

// ── Activities ────────────────────────────────────────────────────────────────
router.get("/activities", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select a.*, l.first_name as lead_first_name, l.last_name as lead_last_name, l.company as lead_company,
        o.name as opportunity_name, o.company as opportunity_company
       from crm_activities a
       left join crm_leads l on l.id=a.lead_id
       left join crm_opportunities o on o.id=a.opportunity_id
       where a.org_id=$1 order by a.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load activities", 500); }
});

router.post("/activities", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = activitySchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const r = await pool.query(
      `insert into crm_activities(org_id,lead_id,opportunity_id,activity_type,subject,description,activity_date,due_date,completed,assigned_to,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [org(req), d.leadId ?? null, d.opportunityId ?? null, d.activityType, d.subject, d.description ?? null, d.activityDate, d.dueDate ?? null, d.completed, d.assignedTo ?? null, d.notes ?? null, req.user!.userId]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to create activity", 500); }
});

router.post("/activities/:id/complete", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const actId = parsedId(req.params.id as string); if (!actId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(
      `update crm_activities set completed=true,completed_date=to_char(now(),'YYYY-MM-DD'),updated_at=now() where id=$1 and org_id=$2 returning *`,
      [actId, org(req)]);
    if (!r.rows[0]) return fail(res, "Activity not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to complete activity", 500); }
});

router.delete("/activities/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const actId = parsedId(req.params.id as string); if (!actId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from crm_activities where id=$1 and org_id=$2 returning id`, [actId, org(req)]);
    if (!r.rows[0]) return fail(res, "Activity not found", 404);
    res.json({ success: true, data: { id: actId } });
  } catch { fail(res, "Failed to delete activity", 500); }
});

// ── Communications ────────────────────────────────────────────────────────────
router.get("/communications", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `select c.*, l.first_name as lead_first_name, l.last_name as lead_last_name, l.company as lead_company
       from crm_communications c
       left join crm_leads l on l.id=c.lead_id
       where c.org_id=$1 order by c.created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load communications", 500); }
});

router.post("/communications", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = communicationSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data;
  try {
    const r = await pool.query(
      `insert into crm_communications(org_id,lead_id,opportunity_id,communication_type,subject,body,communication_date,direction,contact_name,contact_email,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [org(req), d.leadId ?? null, d.opportunityId ?? null, d.communicationType, d.subject, d.body ?? null, d.communicationDate, d.direction, d.contactName ?? null, d.contactEmail ?? null, d.notes ?? null, req.user!.userId]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to create communication", 500); }
});

router.delete("/communications/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const commId = parsedId(req.params.id as string); if (!commId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from crm_communications where id=$1 and org_id=$2 returning id`, [commId, org(req)]);
    if (!r.rows[0]) return fail(res, "Communication not found", 404);
    res.json({ success: true, data: { id: commId } });
  } catch { fail(res, "Failed to delete communication", 500); }
});

// ── Sales Targets ─────────────────────────────────────────────────────────────
router.get("/targets", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(`select * from crm_sales_targets where org_id=$1 order by created_at desc`, [org(req)]);
    res.json({ success: true, data: r.rows });
  } catch { fail(res, "Failed to load sales targets", 500); }
});

router.post("/targets", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = targetSchema.safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  const d = parsed.data; const client = await pool.connect();
  try {
    const o = org(req); await client.query("begin");
    const number = await nextNumber("crm_sales_targets", "TGT", o, client);
    const r = await client.query(
      `insert into crm_sales_targets(org_id,target_number,salesperson,period,period_start,period_end,target_amount,achieved_amount,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [o, number, d.salesperson, d.period, d.periodStart, d.periodEnd, d.targetAmount, d.achievedAmount, d.status, d.notes ?? null, req.user!.userId]);
    await client.query("commit");
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { await client.query("rollback").catch(() => {}); fail(res, "Failed to create sales target", 500); }
  finally { client.release(); }
});

router.put("/targets/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const tgtId = parsedId(req.params.id as string); if (!tgtId) return fail(res, "Invalid id");
  const parsed = targetSchema.partial().safeParse(req.body); if (!parsed.success) return fail(res, "Validation failed");
  try {
    const d = parsed.data;
    const r = await pool.query(
      `update crm_sales_targets set salesperson=coalesce($1,salesperson),period=coalesce($2,period),period_start=coalesce($3,period_start),period_end=coalesce($4,period_end),target_amount=coalesce($5,target_amount),achieved_amount=coalesce($6,achieved_amount),status=coalesce($7,status),notes=coalesce($8,notes),updated_at=now() where id=$9 and org_id=$10 returning *`,
      [d.salesperson ?? null, d.period ?? null, d.periodStart ?? null, d.periodEnd ?? null, d.targetAmount ?? null, d.achievedAmount ?? null, d.status ?? null, d.notes ?? null, tgtId, org(req)]);
    if (!r.rows[0]) return fail(res, "Sales target not found", 404);
    res.json({ success: true, data: r.rows[0] });
  } catch { fail(res, "Failed to update sales target", 500); }
});

router.delete("/targets/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const tgtId = parsedId(req.params.id as string); if (!tgtId) return fail(res, "Invalid id");
  try {
    const r = await pool.query(`delete from crm_sales_targets where id=$1 and org_id=$2 returning id`, [tgtId, org(req)]);
    if (!r.rows[0]) return fail(res, "Sales target not found", 404);
    res.json({ success: true, data: { id: tgtId } });
  } catch { fail(res, "Failed to delete sales target", 500); }
});

export default router;