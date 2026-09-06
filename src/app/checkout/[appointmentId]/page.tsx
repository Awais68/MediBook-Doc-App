import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, CalendarClock, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MockCheckout } from "@/components/booking/mock-checkout";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, formatPKR } from "@/lib/utils";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { appointmentId } = await params;
  const { ref } = await searchParams;
  const user = await requireUser();

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: user.id },
    select: {
      id: true,
      code: true,
      scheduledAt: true,
      fee: true,
      consultationType: true,
      doctor: { select: { slug: true, user: { select: { name: true } } } },
      hospital: { select: { name: true, city: true } },
      payment: { select: { id: true, status: true, amount: true, providerRef: true } },
    },
  });

  if (!appointment) notFound();
  // Nothing to pay for — send them to the appointment itself.
  if (!appointment.payment || appointment.payment.status === "PAID") {
    redirect(`/appointments/${appointment.id}`);
  }

  const providerRef = ref ?? appointment.payment.providerRef;
  if (!providerRef) redirect(`/appointments/${appointment.id}`);

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Secure checkout
          </span>
        </div>
      </header>

      <main className="container grid max-w-4xl gap-6 py-8 md:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-lg font-semibold">Pay for your appointment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your slot is held until payment completes. Booking code {appointment.code}.
            </p>
            <Separator className="my-5" />
            <MockCheckout
              providerRef={providerRef}
              amount={appointment.payment.amount}
              appointmentId={appointment.id}
            />
          </CardContent>
        </Card>

        <aside>
          <Card>
            <CardContent className="p-5 text-sm">
              <h2 className="font-semibold">Order summary</h2>
              <Separator className="my-4" />

              <p className="font-medium">{appointment.doctor.user.name}</p>
              <p className="mt-2 flex items-start gap-2 text-muted-foreground">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
                {appointment.hospital.name}, {appointment.hospital.city}
              </p>
              <p className="mt-1 flex items-start gap-2 text-muted-foreground">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                {formatDateTime(appointment.scheduledAt)}
              </p>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Consultation fee</span>
                <span>{formatPKR(appointment.fee)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Platform fee</span>
                <span>{formatPKR(appointment.payment.amount - appointment.fee, { free: "Free" })}</span>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatPKR(appointment.payment.amount)}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
