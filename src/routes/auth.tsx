import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — OncoTrack" },
      {
        name: "description",
        content:
          "Sign in or create a technologist or patient account to view tumour diagnostics records, results and quality control logs.",
      },
      { property: "og:title", content: "Sign in — OncoTrack" },
      {
        property: "og:description",
        content: "Technologist and patient access to tumour diagnostics records and results.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Sign in to OncoTrack</h1>
        <p className="mt-3 text-muted-foreground">
          Technologists manage patients, examinations, results and quality control. Patients see
          their own record and the results that have been reviewed and approved.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li>· Sign in with your user name and your 5-number access code.</li>
          <li>· Choose your account type when you register.</li>
          <li>· Patients can link their record with their medical record number and date of birth.</li>
          <li>· Results stay hidden from patients until a second reviewer signs them off.</li>
        </ul>
      </div>

      <div className="panel p-6">
        <Tabs defaultValue="signin">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              Create account
            </TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="pt-5">
            <SignInForm />
          </TabsContent>
          <TabsContent value="signup" className="pt-5">
            <SignUpForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CodeInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        required
        maxLength={5}
        placeholder="•••••"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
        className="tracking-[0.5em]"
      />
      <p className="text-xs text-muted-foreground">Exactly 5 numbers.</p>
    </div>
  );
}

function SignInForm() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = normalizeUsername(username);
    if (!USERNAME_PATTERN.test(name) || !CODE_PATTERN.test(code)) {
      toast.error("Check your user name and 5-number code.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(name),
      password: codeToPassword(name, code),
    });
    setBusy(false);
    if (error) {
      toast.error("That user name and code do not match an account.");
      return;
    }
    toast.success("Signed in");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-username">User name</Label>
        <Input
          id="signin-username"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <CodeInput
        id="signin-code"
        label="Access code"
        value={code}
        onChange={setCode}
        autoComplete="current-password"
      />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"patient" | "technologist">("patient");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = normalizeUsername(username);
    if (!USERNAME_PATTERN.test(name)) {
      toast.error("User name: 3-30 characters, letters and numbers only.");
      return;
    }
    if (!CODE_PATTERN.test(code)) {
      toast.error("Your access code must be exactly 5 numbers.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(name),
      password: codeToPassword(name, code),
      options: { data: { full_name: fullName.trim(), role, username: name } },
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "That user name is already taken."
          : error.message,
      );
      return;
    }
    toast.success("Account created");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          required
          maxLength={120}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-username">User name</Label>
        <Input
          id="signup-username"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Letters, numbers, dots, dashes. No email needed.
        </p>
      </div>
      <CodeInput
        id="signup-code"
        label="Choose a 5-number access code"
        value={code}
        onChange={setCode}
        autoComplete="new-password"
      />
      <div className="space-y-2">
        <Label>Account type</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["patient", "technologist"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                role === option
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

