/**
 * Seed demo Advanced CRM data — leads, opportunities, quotations, activities, communications, sales targets.
 * Run: pnpm --filter @workspace/db run seed:crm
 * Safe to re-run: cleans up existing CRM data for the org first.
 */
import { db, organizations } from "./index";
import {
  crmLeads, crmOpportunities, crmQuotations, crmQuotationItems,
  crmActivities, crmCommunications, crmSalesTargets,
} from "./schema/crm";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding Advanced CRM demo data...");

  const [org] = await db.select().from(organizations).limit(1);
  if (!org) { console.error("No org found — run seed first"); process.exit(1); }
  const orgId = org.id;

  // ── Clean up existing CRM data for this org ─────────────────────────────────
  await db.delete(crmQuotationItems);
  await db.delete(crmQuotations).where(eq(crmQuotations.orgId, orgId));
  await db.delete(crmActivities).where(eq(crmActivities.orgId, orgId));
  await db.delete(crmCommunications).where(eq(crmCommunications.orgId, orgId));
  await db.delete(crmOpportunities).where(eq(crmOpportunities.orgId, orgId));
  await db.delete(crmLeads).where(eq(crmLeads.orgId, orgId));
  await db.delete(crmSalesTargets).where(eq(crmSalesTargets.orgId, orgId));

  // ── Leads ───────────────────────────────────────────────────────────────────
  const leads = await db.insert(crmLeads).values([
    { orgId, leadNumber: "LD-0001", firstName: "John", lastName: "Smith", company: "TechCorp Inc.", title: "CTO", email: "john.smith@techcorp.com", phone: "+1 (555) 0101", source: "website", status: "qualified", assignedTo: "Sarah Kim", expectedValue: "25000", notes: "Interested in enterprise ERP solution" },
    { orgId, leadNumber: "LD-0002", firstName: "Maria", lastName: "Garcia", company: "Global Manufacturing", title: "Operations Director", email: "maria.garcia@globalmfg.com", phone: "+1 (555) 0102", source: "referral", status: "contacted", assignedTo: "Sarah Kim", expectedValue: "45000", notes: "Referred by existing client" },
    { orgId, leadNumber: "LD-0003", firstName: "David", lastName: "Chen", company: "Innovate Labs", title: "VP Engineering", email: "david.chen@innovatelabs.com", phone: "+1 (555) 0103", source: "event", status: "new", assignedTo: "Mike Roberts", expectedValue: "15000", notes: "Met at industry conference" },
    { orgId, leadNumber: "LD-0004", firstName: "Emily", lastName: "Johnson", company: "Retail Solutions", title: "CFO", email: "emily.johnson@retailsol.com", phone: "+1 (555) 0104", source: "cold_call", status: "new", assignedTo: "Mike Roberts", expectedValue: "30000", notes: "Cold call follow-up needed" },
    { orgId, leadNumber: "LD-0005", firstName: "Robert", lastName: "Wilson", company: "Healthcare Plus", title: "IT Manager", email: "robert.wilson@healthcareplus.com", phone: "+1 (555) 0105", source: "email", status: "lost", assignedTo: "Sarah Kim", expectedValue: "20000", notes: "Went with competitor" },
  ]).returning();
  console.log("✓ Leads seeded");

  const lead1 = leads.find(l => l.leadNumber === "LD-0001")!;
  const lead2 = leads.find(l => l.leadNumber === "LD-0002")!;
  const lead3 = leads.find(l => l.leadNumber === "LD-0003")!;
  const lead4 = leads.find(l => l.leadNumber === "LD-0004")!;

  // ── Opportunities ───────────────────────────────────────────────────────────
  const opps = await db.insert(crmOpportunities).values([
    { orgId, opportunityNumber: "OPP-0001", leadId: lead1.id, name: "TechCorp ERP Implementation", company: "TechCorp Inc.", contactName: "John Smith", contactEmail: "john.smith@techcorp.com", contactPhone: "+1 (555) 0101", stage: "negotiation", amount: "25000", probability: 80, expectedCloseDate: "2026-09-15", assignedTo: "Sarah Kim", description: "Full ERP implementation for TechCorp", notes: "In final negotiation phase" },
    { orgId, opportunityNumber: "OPP-0002", leadId: lead2.id, name: "Global Manufacturing WMS", company: "Global Manufacturing", contactName: "Maria Garcia", contactEmail: "maria.garcia@globalmfg.com", contactPhone: "+1 (555) 0102", stage: "proposal", amount: "45000", probability: 60, expectedCloseDate: "2026-10-01", assignedTo: "Sarah Kim", description: "Warehouse management system for 3 facilities", notes: "Proposal sent" },
    { orgId, opportunityNumber: "OPP-0003", leadId: lead3.id, name: "Innovate Labs Quality Module", company: "Innovate Labs", contactName: "David Chen", contactEmail: "david.chen@innovatelabs.com", contactPhone: "+1 (555) 0103", stage: "qualification", amount: "15000", probability: 30, expectedCloseDate: "2026-11-01", assignedTo: "Mike Roberts", description: "Quality management module", notes: "Qualifying requirements" },
    { orgId, opportunityNumber: "OPP-0004", leadId: lead4.id, name: "Retail Solutions Finance Suite", company: "Retail Solutions", contactName: "Emily Johnson", contactEmail: "emily.johnson@retailsol.com", contactPhone: "+1 (555) 0104", stage: "prospecting", amount: "30000", probability: 20, expectedCloseDate: "2026-12-01", assignedTo: "Mike Roberts", description: "Finance and accounting suite", notes: "Initial discovery call scheduled" },
  ]).returning();
  console.log("✓ Opportunities seeded");

  const opp1 = opps.find(o => o.opportunityNumber === "OPP-0001")!;
  const opp2 = opps.find(o => o.opportunityNumber === "OPP-0002")!;

  // ── Quotations ──────────────────────────────────────────────────────────────
  const [quote1] = await db.insert(crmQuotations).values({
    orgId, quotationNumber: "QT-0001", opportunityId: opp1.id, leadId: lead1.id,
    customerName: "TechCorp Inc.", customerEmail: "john.smith@techcorp.com", customerPhone: "+1 (555) 0101",
    quotationDate: "2026-08-15", validUntil: "2026-09-15",
    subtotal: "22727.27", taxAmount: "2272.73", totalAmount: "25000",
    status: "sent", notes: "Full ERP implementation quote",
  }).returning();

  await db.insert(crmQuotationItems).values([
    { orgId, quotationId: quote1.id, description: "ERP Implementation - License", quantity: "1", unitPrice: "15000", lineTotal: "15000" },
    { orgId, quotationId: quote1.id, description: "Implementation Services", quantity: "1", unitPrice: "5000", lineTotal: "5000" },
    { orgId, quotationId: quote1.id, description: "Training & Support (1 year)", quantity: "1", unitPrice: "2727.27", lineTotal: "2727.27" },
  ]);

  const [quote2] = await db.insert(crmQuotations).values({
    orgId, quotationNumber: "QT-0002", opportunityId: opp2.id, leadId: lead2.id,
    customerName: "Global Manufacturing", customerEmail: "maria.garcia@globalmfg.com", customerPhone: "+1 (555) 0102",
    quotationDate: "2026-08-18", validUntil: "2026-09-18",
    subtotal: "40909.09", taxAmount: "4090.91", totalAmount: "45000",
    status: "draft", notes: "WMS for 3 facilities",
  }).returning();

  await db.insert(crmQuotationItems).values([
    { orgId, quotationId: quote2.id, description: "WMS License (3 sites)", quantity: "3", unitPrice: "10000", lineTotal: "30000" },
    { orgId, quotationId: quote2.id, description: "Implementation & Integration", quantity: "1", unitPrice: "10909.09", lineTotal: "10909.09" },
  ]);
  console.log("✓ Quotations seeded");

  // ── Activities ──────────────────────────────────────────────────────────────
  await db.insert(crmActivities).values([
    { orgId, leadId: lead1.id, opportunityId: opp1.id, activityType: "meeting", subject: "Final negotiation meeting", description: "Discuss contract terms and pricing", activityDate: "2026-08-20", dueDate: "2026-08-20", completed: true, completedDate: "2026-08-20", assignedTo: "Sarah Kim", notes: "Positive outcome" },
    { orgId, leadId: lead2.id, opportunityId: opp2.id, activityType: "follow_up", subject: "Follow up on WMS proposal", description: "Check status of proposal with Maria", activityDate: "2026-08-22", dueDate: "2026-08-25", completed: false, assignedTo: "Sarah Kim", notes: "Waiting for feedback" },
    { orgId, leadId: lead3.id, activityType: "call", subject: "Discovery call with Innovate Labs", description: "Understand quality management needs", activityDate: "2026-08-23", dueDate: "2026-08-23", completed: false, assignedTo: "Mike Roberts", notes: "Scheduled" },
    { orgId, leadId: lead4.id, activityType: "email", subject: "Send product brochure", description: "Send finance suite brochure to Emily", activityDate: "2026-08-21", dueDate: "2026-08-21", completed: true, completedDate: "2026-08-21", assignedTo: "Mike Roberts", notes: "Sent" },
  ]);
  console.log("✓ Activities seeded");

  // ── Communications ──────────────────────────────────────────────────────────
  await db.insert(crmCommunications).values([
    { orgId, leadId: lead1.id, opportunityId: opp1.id, communicationType: "email", subject: "ERP proposal follow-up", body: "Following up on the ERP implementation proposal", communicationDate: "2026-08-16", direction: "outbound", contactName: "John Smith", contactEmail: "john.smith@techcorp.com", notes: "Sent proposal" },
    { orgId, leadId: lead2.id, opportunityId: opp2.id, communicationType: "phone", subject: "WMS requirements call", body: "Discussed WMS requirements for 3 facilities", communicationDate: "2026-08-17", direction: "inbound", contactName: "Maria Garcia", contactEmail: "maria.garcia@globalmfg.com", notes: "Detailed requirements gathered" },
    { orgId, leadId: lead3.id, communicationType: "email", subject: "Conference follow-up", body: "Thanks for meeting at the conference", communicationDate: "2026-08-18", direction: "outbound", contactName: "David Chen", contactEmail: "david.chen@innovatelabs.com", notes: "Follow-up after event" },
  ]);
  console.log("✓ Communications seeded");

  // ── Sales Targets ───────────────────────────────────────────────────────────
  await db.insert(crmSalesTargets).values([
    { orgId, targetNumber: "TGT-0001", salesperson: "Sarah Kim", period: "monthly", periodStart: "2026-08-01", periodEnd: "2026-08-31", targetAmount: "50000", achievedAmount: "25000", status: "active", notes: "August target" },
    { orgId, targetNumber: "TGT-0002", salesperson: "Mike Roberts", period: "monthly", periodStart: "2026-08-01", periodEnd: "2026-08-31", targetAmount: "40000", achievedAmount: "15000", status: "active", notes: "August target" },
    { orgId, targetNumber: "TGT-0003", salesperson: "Sarah Kim", period: "quarterly", periodStart: "2026-07-01", periodEnd: "2026-09-30", targetAmount: "150000", achievedAmount: "70000", status: "active", notes: "Q3 target" },
    { orgId, targetNumber: "TGT-0004", salesperson: "Mike Roberts", period: "quarterly", periodStart: "2026-07-01", periodEnd: "2026-09-30", targetAmount: "120000", achievedAmount: "45000", status: "active", notes: "Q3 target" },
  ]);
  console.log("✓ Sales targets seeded");

  console.log("\n✅ Advanced CRM demo data seeded successfully!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });