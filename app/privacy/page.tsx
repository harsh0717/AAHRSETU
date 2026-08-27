'use client';

import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import { COLLEGE_INFO } from '@/lib/constants';
import styles from './privacy.module.css';

export default function PrivacyPolicyPage() {
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
            <span>🔒</span> Enterprise Governance & Compliance
          </span>

          <h1 className={styles.title}>Institutional Privacy Policy</h1>
          <p className={styles.subtitle}>
            Official privacy, data governance, and role-based confidentiality protocol governing {COLLEGE_INFO.name} meal requisitions, approval audits, and financial ledgers.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <strong>Effective Date:</strong> {effectiveDate}
            </div>
            <div className={styles.metaItem}>
              <strong>Last Reviewed:</strong> {lastUpdated}
            </div>
            <div className={styles.metaItem}>
              <strong>Version:</strong> v2.4 (Statutory DPDPA 2023 Compliant)
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className={styles.container}>
        <div className={styles.card}>
          {/* Executive Summary Callout */}
          <div className={styles.summaryBox}>
            <h4>🛡️ Privacy & Confidentiality Guarantee</h4>
            <p>
              AharSetu is an internal institutional platform strictly dedicated to academic meal requisitioning and audit compliance. We do not sell, monetize, or disclose student or faculty data to third-party advertisers. All requisition records, financial settlements, and principal authorization signatures are protected by role-based encryption and immutable audit logs.
            </p>
          </div>

          {/* Table of Contents */}
          <nav className={styles.tocSection} aria-label="Table of Contents">
            <div className={styles.tocTitle}>Table of Contents</div>
            <div className={styles.tocGrid}>
              <a href="#section-1" className={styles.tocLink}>1. Scope & Governance</a>
              <a href="#section-2" className={styles.tocLink}>2. Information We Collect</a>
              <a href="#section-3" className={styles.tocLink}>3. Role-Based Access (RBAC)</a>
              <a href="#section-4" className={styles.tocLink}>4. Audit Trails & Retention</a>
              <a href="#section-5" className={styles.tocLink}>5. Data Security Standards</a>
              <a href="#section-6" className={styles.tocLink}>6. Cookies & Client Caching</a>
              <a href="#section-7" className={styles.tocLink}>7. Third-Party Disclosures</a>
              <a href="#section-8" className={styles.tocLink}>8. User Rights & Data Requests</a>
              <a href="#section-9" className={styles.tocLink}>9. Statutory Compliance</a>
              <a href="#section-10" className={styles.tocLink}>10. Contact & Grievances</a>
            </div>
          </nav>

          {/* Section 1 */}
          <section id="section-1" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>1</span> Scope & Institutional Governance
            </h2>
            <p className={styles.text}>
              This Privacy Policy applies to all users accessing or utilizing the <strong>AharSetu</strong> software application across campus units, including Department Coordinators, Principals, Administration / DCR Auditors, System Administrators, and Authorized Canteen Vendors operating within {COLLEGE_INFO.name}.
            </p>
            <p className={styles.text}>
              By authenticating with institutional credentials or submitting meal requisitions, authorized users acknowledge and consent to the data processing practices described in this document.
            </p>
          </section>

          {/* Section 2 */}
          <section id="section-2" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>2</span> Information We Collect
            </h2>
            <p className={styles.text}>
              AharSetu collects only the minimum operational data strictly necessary for fulfilling campus meal requisitions, regulatory budget authorizations, and GST-compliant invoicing:
            </p>
            <ul className={styles.list}>
              <li><strong>User Identity & Credentials:</strong> Institutional email, full name, assigned department, authorized role tier, and encrypted password hash.</li>
              <li><strong>Requisition Details:</strong> Event title, purpose, guest count, dietary selection (100% Pure Vegetarian), designated delivery venue, order timestamp, and estimated line-item cost.</li>
              <li><strong>Verification Signatures:</strong> Digital verification timestamps, approving officer ID, budget clearance status, and rejection rationale (where applicable).</li>
              <li><strong>Vendor Fulfillment Metrics:</strong> Real-time cooking status, dish availability schedules, unit prices, batch dispatch acknowledgments, and monthly settlement passbooks.</li>
              <li><strong>Device & Network Logs:</strong> Client IP address, browser user-agent, session identifiers, and PWA installation state for security audit trails.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="section-3" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>3</span> Role-Based Access Control (RBAC)
            </h2>
            <p className={styles.text}>
              Access to requisition data is strictly segregated using cryptographic role boundaries:
            </p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Role Tier</th>
                    <th>Data Access Scope</th>
                    <th>Audit Authority</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Coordinator</strong></td>
                    <td>Department-specific drafts, pending orders, and delivery status</td>
                    <td>View own department history</td>
                  </tr>
                  <tr>
                    <td><strong>Principal</strong></td>
                    <td>Cross-department budget requisitions awaiting executive verification</td>
                    <td>Approve, reject, or modify requisitions</td>
                  </tr>
                  <tr>
                    <td><strong>Canteen Vendor</strong></td>
                    <td>Approved kitchen order items, quantities, delivery times, and settlement ledgers</td>
                    <td>Update preparation status & menu pricing</td>
                  </tr>
                  <tr>
                    <td><strong>Administration / DCR</strong></td>
                    <td>Campus-wide financial ledgers, GST tax invoices, and payment passbooks</td>
                    <td>Final monthly settlement & audit closure</td>
                  </tr>
                  <tr>
                    <td><strong>System Admin</strong></td>
                    <td>Identity lifecycle, system health telemetry, and immutable audit logs</td>
                    <td>Security monitoring & user provisioning</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section id="section-4" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>4</span> Audit Trails & Data Retention
            </h2>
            <p className={styles.text}>
              Under standard institutional financial accounting regulations and GST compliance mandates:
            </p>
            <ul className={styles.list}>
              <li><strong>Financial & Invoice Records:</strong> Retained for a mandatory statutory period of <strong>7 academic years</strong> from the date of settlement.</li>
              <li><strong>Operational Logs:</strong> Session logs, status modification events, and notification deliveries are retained for <strong>180 days</strong>.</li>
              <li><strong>Archival Protocol:</strong> Expired requisition records are securely pseudonymized and archived in institutional long-term storage.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="section-5" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>5</span> Data Security Standards
            </h2>
            <p className={styles.text}>
              AharSetu enforces industry-standard technical and organizational security controls:
            </p>
            <div className={styles.highlightCard}>
              <h5>🔐 Cryptographic Encryption Standards</h5>
              <p>All data in transit is encrypted using TLS 1.3. Stored database records and sensitive financial passbooks are encrypted at rest with AES-256 standards.</p>
            </div>
            <ul className={styles.list}>
              <li><strong>Immutable Audit Logging:</strong> Order modifications, status updates, and settlement adjustments are permanently appended to an unalterable log stream.</li>
              <li><strong>Automated Session Expiry:</strong> Idle authenticated sessions terminate automatically after inactivity to prevent unauthorized terminal access.</li>
              <li><strong>Input Sanitization:</strong> Strict schema validation and parameterized queries prevent injection vectors.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="section-6" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>6</span> Cookies & Client Caching
            </h2>
            <p className={styles.text}>
              AharSetu uses essential first-party cookies and modern browser storage (IndexedDB / LocalStorage) strictly for:
            </p>
            <ul className={styles.list}>
              <li>Maintaining secure authentication state across page navigations.</li>
              <li>Storing user language preference (English, Hindi, Gujarati).</li>
              <li>Enabling offline PWA synchronization for low-connectivity kitchen environments.</li>
            </ul>
            <p className={styles.text}>
              We do not use tracking pixels, analytics cookies, or cross-site tracking technologies.
            </p>
          </section>

          {/* Section 7 */}
          <section id="section-7" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>7</span> Zero Third-Party Disclosures
            </h2>
            <p className={styles.text}>
              Information stored on AharSetu is never rented, licensed, or shared with commercial entities. Disclosures are strictly limited to:
            </p>
            <ul className={styles.list}>
              <li>Authorized statutory auditors appointed by the institution.</li>
              <li>Law enforcement agencies pursuant to valid legal process under applicable laws of India.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="section-8" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>8</span> User Rights & Grievances
            </h2>
            <p className={styles.text}>
              Authorized personnel maintain rights to review their requisition history, request corrections to profile metadata, and verify department budget allocations by contacting their Department Head or System Administrator.
            </p>
          </section>

          {/* Section 9 */}
          <section id="section-9" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>9</span> Statutory & Regulatory Compliance
            </h2>
            <p className={styles.text}>
              This platform adheres to:
            </p>
            <ul className={styles.list}>
              <li><strong>Digital Personal Data Protection Act (DPDPA), 2023</strong> (India).</li>
              <li><strong>Information Technology Act, 2000</strong> & associated intermediary guidelines.</li>
              <li><strong>FSSAI Food Safety & Standards Guidelines</strong> for institutional canteen catering.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section id="section-10" className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>10</span> Contact Information
            </h2>
            <p className={styles.text}>
              For inquiries regarding this privacy framework, data governance, or compliance audit requests, please contact:
            </p>
            <div className={styles.contactBox}>
              <div><strong>Institutional Authority:</strong> {COLLEGE_INFO.name}</div>
              <div><strong>Office:</strong> Administration & Data Protection Officer (DPO)</div>
              <div><strong>Address:</strong> {COLLEGE_INFO.address}</div>
              <div><strong>Email:</strong> privacy@aaharsetu.edu.in / info@aaharsetu.edu.in</div>
              <div><strong>Helpline:</strong> {COLLEGE_INFO.phone}</div>
            </div>
          </section>

          {/* Footer Navigation */}
          <div className={styles.footerNav}>
            <Link href="/terms" className={styles.backBtn} style={{ background: '#0F172A' }}>
              Read Terms of Service →
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
