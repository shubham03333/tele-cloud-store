"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cloud } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("Owner");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/setup")
      .then((response) => response.json())
      .then((data) => setNeedsSetup(Boolean(data.needsSetup)))
      .finally(() => setReady(true));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = needsSetup
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Authentication failed");
      setLoading(false);
      return;
    }

    await fetch("/api/audit/login", { method: "POST" }).catch(() => undefined);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]">
        <ThemeToggle />
      </div>
      <form onSubmit={onSubmit} className="glass w-full max-w-md rounded-[28px] p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Nimbus Drive</h1>
            <p className="text-sm text-muted-foreground">
              {needsSetup ? "Create the owner account" : "Sign in to your private cloud"}
            </p>
          </div>
        </div>
        {needsSetup ? (
          <label className="mb-3 block text-sm">
            Name
            <Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
        ) : null}
        <label className="mb-3 block text-sm">
          Email
          <Input className="mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="mb-4 block text-sm">
          Password
          <Input
            className="mt-1"
            type="password"
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading || !ready}>
          {loading ? "Please wait" : needsSetup ? "Create account" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
