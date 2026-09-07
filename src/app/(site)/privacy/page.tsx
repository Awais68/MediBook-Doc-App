import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/shared/legal-page";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${APP_NAME} collects, uses and protects your health data.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="7 September 2026"
      intro={`Health data is the most sensitive data you will ever give an app. This explains exactly what ${APP_NAME} stores, who can see it, and how you get it deleted. This is a template — have it reviewed against PECA 2016 and the applicable data protection law before launch.`}
    >
      <Section heading="1. What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account data:</strong> name, phone, email, password hash, city, date of birth,
            gender, CNIC (optional), profile photo.
          </li>
          <li>
            <strong>Health data:</strong> blood group, allergies, chronic conditions, current
            medications, consultation notes, vitals, prescriptions, lab orders and any documents you
            upload.
          </li>
          <li>
            <strong>Booking data:</strong> appointments, payments, refunds, reviews, family members
            you book for.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, device and browser, and an audit log of
            sensitive actions.
          </li>
        </ul>
      </Section>

      <Section heading="2. Who can see your health data">
        <p>
          By default, only you. A doctor can see your chart only when there is an active care
          relationship — that is, a real appointment between you and that doctor. Uploaded documents
          are private until you explicitly share them, and every share is revocable and can be
          time-limited. Admin staff can see bookings and payments, not clinical notes.
        </p>
      </Section>

      <Section heading="3. Why we process it">
        <p>
          To run the booking (contract), to keep a medical record your doctor is legally required to
          keep (legal obligation), to prevent fraud and abuse (legitimate interest), and to send you
          reminders. Marketing messages need your separate opt-in and every message carries an
          unsubscribe.
        </p>
      </Section>

      <Section heading="4. Who we share with">
        <ul className="list-disc space-y-1 pl-5">
          <li>The doctor and hospital you booked with.</li>
          <li>Payment processors, who receive the amount and a reference — never your health data.</li>
          <li>SMS and email providers, who receive your phone or email and the message text.</li>
          <li>Law enforcement, only on a valid legal order.</li>
        </ul>
        <p>We never sell your data, and we never use your health data for advertising.</p>
      </Section>

      <Section heading="5. How long we keep it">
        <p>
          Clinical records are retained for 10 years from the last visit, in line with medical
          record-keeping practice. Payment records are kept as long as tax law requires. Everything
          else is deleted within 90 days of you closing your account.
        </p>
      </Section>

      <Section heading="6. Your rights">
        <ul className="list-disc space-y-1 pl-5">
          <li>Download your full record from Settings.</li>
          <li>Correct anything wrong in your profile at any time.</li>
          <li>Revoke a document share instantly.</li>
          <li>
            Ask us to delete your account. We will delete everything we are not legally required to
            retain, and tell you what stayed and why.
          </li>
        </ul>
      </Section>

      <Section heading="7. Security">
        <p>
          Passwords are hashed, sessions are signed, transport is TLS-only, access to clinical data
          is checked against the care relationship on every request, and sensitive actions are
          written to an append-only audit log. No system is perfect: if a breach affects you, we
          will tell you.
        </p>
      </Section>

      <Section heading="8. Children">
        <p>
          Accounts are for adults. A child can be added as a family member by a parent or guardian,
          who controls that record.
        </p>
      </Section>

      <Section heading="9. Contact">
        <p>
          Data protection queries:{" "}
          <a className="underline" href="mailto:privacy@medibook.pk">privacy@medibook.pk</a>. See
          also our <Link className="underline" href="/terms">Terms of Service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
