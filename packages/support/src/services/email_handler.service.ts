import { broker } from '../db.js';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('support:email_handler');

/**
 * Service: EmailHandler
 * 
 * Simulates an email processing engine that:
 * 1. Parses inbound email
 * 2. Matches/Creates Contact
 * 3. Threads into existing Case or creates new Case
 */
export class EmailHandler {
 
 /**
 * Process an inbound email payload
 */
 static async processInboundEmail(payload: {
 from_address: string;
 from_name: string;
 subject: string;
 body: string;
 message_id: string;
 }) {
 logger.info(`Processing inbound email from ${payload.from_address}: "${payload.subject}"`);

 // 1. Resolve Contact & Account
 const contact = await this.findOrCreateContact(payload.from_address, payload.from_name);
 
 // 2. Threading Check (Look for [Ref:CASE-XXXX] pattern)
 const caseRefMatch = payload.subject.match(/\[Ref:(CASE-\d+)\]/);
 let caseId = null;

 if (caseRefMatch) {
 const caseNumber = caseRefMatch[1];
 const existingCase = await this.findCaseByNumber(caseNumber);
 if (existingCase) {
 caseId = existingCase._id;
 logger.info(`🔗 Threading email to existing case: ${caseNumber}`);
 }
 }

 // 3. Create or Link Case
 if (caseId) {
 // Add email message to existing case
 await this.logEmailMessage(caseId, payload, 'Inbound');
 // Update status if needed
 await broker.update('case', caseId, { status: 'new_response', last_activity_date: new Date().toISOString() });
 } else {
 // Create new Case
 const newCase = await broker.insert('case', {
 subject: payload.subject,
 description: payload.body,
 origin: 'email',
 status: 'new',
 priority: 'medium',
 contact: contact._id,
 account: contact.account,
 supplied_email: payload.from_address
 });
 caseId = newCase._id;
 logger.info(`🆕 Created new case from email: ${newCase._id}`);
 
 // Log the initial email
 await this.logEmailMessage(caseId, payload, 'Inbound');
 
 // Auto-Assign (Stub)
 // await AssignmentRules.run(newCase);
 }

 return { success: true, case_id: caseId };
 }

 private static async findOrCreateContact(email: string, name: string) {
 const contacts = await broker.find('contact', { filters: [['email', '=', email]] });
 if (contacts.length > 0) {
 return contacts[0];
 }
 
 // Create new (if policy allows)
 // For now, we assume we create a standalone contact or lead
 // Here we'll just create a contact without an account for simplicity
 const nameParts = name.split(' ');
 const newContact = await broker.insert('contact', {
 first_name: nameParts[0],
 last_name: nameParts.slice(1).join(' ') || 'unknown',
 email: email,
 lead_source: 'Email/Support'
 });
 return newContact;
 }

 private static async findCaseByNumber(caseNumber: string) {
 const cases = await broker.find('case', { filters: [['case_number', '=', caseNumber]] });
 return cases.length > 0 ? cases[0] : null;
 }

 private static async logEmailMessage(caseId: string, email: any, direction: 'Inbound' | 'Outbound') {
 // In a real system, we would have an 'email_message' object
 // using 'activity' for now as a proxy
 await broker.insert('activity', {
 subject: (direction === 'Inbound' ? 'Email Received: ' : 'Email Sent: ') + email.subject,
 type: 'email',
 status: 'completed',
 who_id: caseId, // Polymorphic link simulation
 description: email.body,
 activity_date: new Date().toISOString()
 });
 }
}
