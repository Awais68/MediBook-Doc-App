import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { ROLE_HOME } from "@/lib/constants";

export const metadata = { title: "Access denied" };

export default async function ForbiddenPage() {
  const user = await getSessionUser();
  const home = user ? ROLE_HOME[user.role] ?? "/dashboard" : "/";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-bold">You don&apos;t have access to this page</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This area is limited to a different role. If you think this is a mistake, contact support.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href={home}>Go to your dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
