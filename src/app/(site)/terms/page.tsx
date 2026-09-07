import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/shared/legal-page";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The rules for using ${APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="7 September 2026"
      intro={`These terms govern your use of ${APP_NAME}. By creating an account or booking an appointment you accept them. This is a template — have it reviewed by a lawyer before you go live.`}
    >
      <Section heading="1. What MediBook is">
        <p>
          {APP_NAME} is a booking platform. We connect patients with independently practising,
          PMDC-registered doctors and with hospitals. We do not practise medicine, we do not employ
          the doctors listed here, and we do not provide medical advice, diagnosis or treatment.
          Every clinical decision is between you and your doctor.
        </p>
      </Section>

      <Section heading="2. Emergencies">
        <p className="font-medium">
          Do not use {APP_NAME} in an emergency. Call 1122 or go to the nearest emergency
          department.
        </p>
      </Section>

      <Section heading="3. Your account">
        <ul className="list-disc space-y-1 pl-5">
          <li>You must be 18 or older to hold an account. Minors can be booked as family members.</li>
          <li>The information you give us — name, CNIC, phone, medical history — must be accurate.</li>
          <li>You are responsible for everything done from your account. Keep your password safe.</li>
          <li>We may suspend an account for fraud, abuse of staff, or repeated no-shows.</li>
        </ul>
      </Section>

      <Section heading="4. Bookings, fees and payments">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fees are set by the doctor for each practice location and shown before you confirm.</li>
          <li>
            You may pay online or at the clinic. Paying online only reserves the slot; the doctor
            may still reschedule for clinical reasons.
          </li>
          <li>
            A platform service fee may be added to online payments. It is displayed separately at
            checkout.
          </li>
          <li>
            Slots are held for a short window while you complete checkout and are released
            automatically if you do not.
          </li>
        </ul>
      </Section>

      <Section heading="5. Cancellations, refunds and no-shows">
        <ul className="list-disc space-y-1 pl-5">
          <li>Cancel free of charge up to the cut-off shown on the appointment.</li>
          <li>
            If the doctor cancels, or does not show, you get a full refund to the original payment
            method.
          </li>
          <li>
            If you do not show up, the consultation fee may be retained. Repeated no-shows can
            restrict online booking on your account.
          </li>
          <li>Approved refunds are issued within 7–10 working days.</li>
        </ul>
      </Section>

      <Section heading="6. Follow-ups">
        <p>
          Doctors set a free or reduced-fee follow-up window (typically 14 days) per practice
          location. A follow-up booked inside that window against the same original visit is charged
          at the follow-up fee. Outside the window it is a fresh consultation.
        </p>
      </Section>

      <Section heading="7. Reviews">
        <p>
          Only patients with a completed, verified visit can review a doctor. Reviews are moderated
          for personal data, abuse and spam — not for being critical. Doctors may reply publicly
          once. We remove reviews that contain identifiable clinical details of another person.
        </p>
      </Section>

      <Section heading="8. For doctors and hospitals">
        <ul className="list-disc space-y-1 pl-5">
          <li>You warrant that your PMDC registration is valid and current.</li>
          <li>You are responsible for keeping your schedule, fees and time off accurate.</li>
          <li>
            Patient records you create here belong to the patient. You may access them only for a
            patient in your care.
          </li>
        </ul>
      </Section>

      <Section heading="9. Liability">
        <p>
          To the extent permitted by law, {APP_NAME} is not liable for the clinical outcome of any
          consultation, for a doctor&apos;s conduct, or for indirect losses. Our aggregate liability
          for any claim is limited to the fees you paid us for the booking in question.
        </p>
      </Section>

      <Section heading="10. Governing law">
        <p>
          These terms are governed by the laws of the Islamic Republic of Pakistan. Courts at Lahore
          have exclusive jurisdiction.
        </p>
      </Section>

      <Section heading="11. Contact">
        <p>
          Questions about these terms: <a className="underline" href="mailto:legal@medibook.pk">legal@medibook.pk</a>.
          See also our <Link className="underline" href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
