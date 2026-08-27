'use client';

import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import { COLLEGE_INFO } from '@/lib/constants';
import styles from './terms.module.css';

export default function TermsOfServicePage() {
  const lastUpdated = 'August 27, 2026';
  const effectiveDate = 'September 1, 2026';

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerGlow} aria-hidden="true" />
        <div className={styles.headerGlow2} aria-hidden="true" />

        <div className={styles.headerInner}>
          <div className={styles.topNavRow}>
            <Link href="/login" className={styles.backBtn}>
              <span>←</span> Back to AharSetu
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BrandLogo size={42} />
              <button
                type="button"
                onClick={handlePrint}
                className={styles.backBtn}
                style={{ cursor: 'pointer' }}
              >
                <span>🖨️</span> Print / Save PDF
              </button>
            </div>
          </div>

          <span className={styles.badge}>
            <span>⚖️</span> Campus Requisition Protocol
          </span>

          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.subtitle}>
            Rules, operational mandates, and institutional accounting standards governing meal requisitions, kitchen fulfillment, and financial audits across {COLLEGE_INFO.name}.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <strong>Effective Date:</strong> {effectiveDate}
            </div>
            <div className={styles.metaItem}>
              <strong>Last Revised:</strong> {lastUpdated}
            </div>
            <div className={styles.metaItem}>
              <strong>Governance:</strong> Institutional Financial & Hospitality Code
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className={styles.container}>
        <div className={styles.card}>
          {/* Executive Summary Callout */}
          <div className={styles.summaryBox}>
            <h4>📜 Summary of Platform Rules</h4>
            <p>
              AharSetu is the authoritative institutional platform for academic and executive hospitality requisitions. All orders require Department Coordinator initiation, Principal verification, and DCR audit clearance. Canteens must strictly adhere to <strong>100% Pure Vegetarian & Egg-Free</strong> dietary regulations and official item pricing.
            </p>
          </div>

          {/* Table of Contents */}
          <nav className={styles.tocSection} aria-label="Table of Contents">
            <div className={styles.tocTitle}>Table of Contents</div>
            <div className={styles.tocGrid}>
              <a href="#term-1" className={styles.tocLink}>1. Acceptance & Authority</a>
              <a href="#term-2" className={styles.tocLink}>2. 4-Stage Requisition Lifecycle</a>
              <a href="#term-3" className={styles.tocLink}>3. Pure-Veg & Food Safety Mandate</a>
              <a href="#term-4" className={styles.tocLink}>4. Canteen Vendor Obligations</a>
              <a href="#term-5" className={styles.tocLink}>5. Pricing, Invoicing & GST</a>
              <a href="#term-6" className={styles.tocLink}>6. Cancellations & Wastage Prevention</a>
              <a href="#term-7" className={styles.tocLink}>7. Account Security & RBAC</a>
              <a href="#term-8" className={styles.tocLink}>8. Audit, Passbooks & Settlements</a>
              <a href="#term-9" className={styles.tocLink}>9. Disciplinary Governance</a>
              <a href="#term-10" className={styles.tocLink}>10. Jurisdiction & Inquiries</a>
            </div>
          </nav>

          {/* Term 1 */}
          <section id="term-1" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>1</span> Acceptance & Institutional Authority
            </h2>
            <p className={styles.text}>
              By accessing or submitting transactions through <strong>AharSetu</strong>, authorized personnel (Department Coordinators, Principals, Administration / DCR Officers, and Canteen Vendors) agree to be bound by these Terms of Service, institutional budget directives, and food safety policies enacted by {COLLEGE_INFO.name}.
            </p>
            <p className={styles.text}>
              Unauthorized access, automated scraping, credential sharing, or submission of fraudulent requisitions constitutes a violation of institutional policy and will be subject to disciplinary and financial remedies.
            </p>
          </section>

          {/* Term 2 */}
          <section id="term-2" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>2</span> 4-Stage Requisition Lifecycle
            </h2>
            <p className={styles.text}>
              Every institutional catering request must traverse the official sequential protocol:
            </p>
            <ul className={styles.list}>
              <li><strong>Stage 1: Department Draft (Coordinator) —</strong> The designated department coordinator creates the itemized requisition specifying guest count, event purpose, delivery venue, and target delivery slot.</li>
              <li><strong>Stage 2: Principal Verification (Principal) —</strong> The institutional executive reviews department budget headroom, approves, modifies, or rejects the requisition with stated rationale.</li>
              <li><strong>Stage 3: Kitchen Fulfillment (Canteen Vendor) —</strong> Authorized canteen receives digital kitchen dispatch tickets, updates live preparation status, and logs fulfillment batches.</li>
              <li><strong>Stage 4: Account Settlement (DCR / Administration) —</strong> Post-event audit verification, automated itemized GST bill clearance, and monthly vendor passbook settlement.</li>
            </ul>
          </section>

          {/* Term 3 */}
          <section id="term-3" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>3</span> 100% Pure Vegetarian & Egg-Free Mandate
            </h2>
            <div className={styles.highlightCard}>
              <h5>🌿 Strict Campus Dietary Regulation</h5>
              <p>All items prepared, cataloged, or delivered through AharSetu must be strictly 100% Pure Vegetarian and completely Egg-Free, prepared under certified hygienic conditions conforming to institutional and FSSAI standards.</p>
            </div>
            <p className={styles.text}>
              Any vendor found introducing non-vegetarian ingredients, egg derivatives, or compromised consumables will face immediate contract suspension, platform de-listing, and institutional sanctions.
            </p>
          </section>

          {/* Term 4 */}
          <section id="term-4" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>4</span> Canteen Vendor Obligations
            </h2>
            <p className={styles.text}>
              Participating canteen vendors agree to:
            </p>
            <ul className={styles.list}>
              <li>Maintain accurate real-time dish availability and honor catalog pricing approved by campus administration.</li>
              <li>Acknowledge approved requisitions within the SLA dispatch window (minimum 30 minutes prior to delivery slot).</li>
              <li>Ensure packaging hygiene, hot beverage temperature integrity, and punctual delivery to designated campus seminar halls/departments.</li>
            </ul>
          </section>

          {/* Term 5 */}
          <section id="term-5" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>5</span> Pricing, Invoicing & GST Compliance
            </h2>
            <p className={styles.text}>
              All platform requisitions generate authoritative digital invoices with itemized tax breakdowns (CGST + SGST where applicable) compliant with statutory GST provisions.
            </p>
            <ul className={styles.list}>
              <li>Discounts, volume adjustments, or emergency surcharge modifications must be approved in writing by the Administration Office.</li>
              <li>Digital invoices generated on AharSetu serve as immutable audit vouchers for institutional financial reporting.</li>
            </ul>
          </section>

          {/* Term 6 */}
          <section id="term-6" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>6</span> Cancellations & Wastage Prevention
            </h2>
            <p className={styles.text}>
              To prevent food wastage and unnecessary financial liability:
            </p>
            <ul className={styles.list}>
              <li>Requisitions may be cancelled without penalty while in <em>Draft</em> or <em>Pending Principal Approval</em> status.</li>
              <li>Orders cancelled after kitchen preparation has commenced (<em>In Kitchen</em> status) require Principal clearance, and raw material costs may be charged to the department's contingency allocation.</li>
            </ul>
          </section>

          {/* Term 7 */}
          <section id="term-7" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>7</span> Account Security & RBAC
            </h2>
            <p className={styles.text}>
              Users are strictly responsible for safeguarding their institutional passwords. Multi-user sharing of individual credentials (e.g. Principal or DCR approval keys) is strictly prohibited.
            </p>
          </section>

          {/* Term 8 */}
          <section id="term-8" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>8</span> Passbooks & Monthly Settlements
            </h2>
            <p className={styles.text}>
              Vendor disbursements are reconciled on a monthly billing cycle. The DCR office executes final settlements based on electronically verified receipts and discrepancy reports submitted through AharSetu.
            </p>
          </section>

          {/* Term 9 */}
          <section id="term-9" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>9</span> Disciplinary Governance & Modification
            </h2>
            <p className={styles.text}>
              The institution reserves the right to modify these Terms of Service and system features to accommodate regulatory updates or institutional restructuring. Continued use after revisions constitutes acceptance of the amended Terms.
            </p>
          </section>

          {/* Term 10 */}
          <section id="term-10" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>10</span> Inquiries & Governing Jurisdiction
            </h2>
            <p className={styles.text}>
              These terms are governed by the internal rules of {COLLEGE_INFO.name} and the applicable laws of India. For administrative clarifications, contact:
            </p>
            <div className={styles.contactBox}>
              <div><strong>Authority:</strong> Office of the Registrar & Administration</div>
              <div><strong>Campus:</strong> {COLLEGE_INFO.name}</div>
              <div><strong>Address:</strong> {COLLEGE_INFO.address}</div>
              <div><strong>Email:</strong> administration@aaharsetu.edu.in</div>
              <div><strong>Phone:</strong> {COLLEGE_INFO.phone}</div>
            </div>
          </section>

          {/* Footer Navigation */}
          <div className={styles.footerNav}>
            <Link href="/privacy" className={styles.backBtn} style={{ background: '#0F172A' }}>
              ← Read Privacy Policy
            </Link>
            <Link href="/login" className={styles.backBtn} style={{ background: '#16A34A', border: 'none' }}>
              Return to Login Screen
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
