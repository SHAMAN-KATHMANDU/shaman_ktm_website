-- PR 9 (wholesale storefront): let a lead exist without a staff author.
--
-- The /wholesale enquiry form is filled in by the customer, so no staff member
-- wrote the lead down. The alternative — a placeholder "Website" row in Staff —
-- would put a person who does not exist into the staff table, and every figure
-- that counts leads per staff member would silently include a robot.
--
-- What still holds: where a lead came from is required and non-null
-- (CrmLead.sourceId), the opening status-history row is still written in the
-- same transaction, and createLead() — the staff path — still demands an id.
-- Only createWebEnquiry() may leave these null.

ALTER TABLE "CrmLead" ALTER COLUMN "createdByStaffId" DROP NOT NULL;
ALTER TABLE "CrmLeadStatusHistory" ALTER COLUMN "changedByStaffId" DROP NOT NULL;
