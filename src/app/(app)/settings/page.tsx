"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STORAGE_CATEGORIES } from "@/types";
import { CATEGORY_LABELS } from "@/lib/categories";
import { toast } from "sonner";

type TelegramState = {
  configured: boolean;
  connected: boolean;
  lastError: string | null;
  channels: { category: string; title: string; peerId: string }[];
};

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SettingsPage() {
  const [telegram, setTelegram] = useState<TelegramState | null>(null);
  const [categories, setCategories] = useState<string[]>([...STORAGE_CATEGORIES]);
  const [sessionValue, setSessionValue] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [peer, setPeer] = useState("");
  const [category, setCategory] = useState("files");
  const [syncing, setSyncing] = useState(false);

  async function refresh() {
    const [telegramResponse, categoriesResponse] = await Promise.all([fetch("/api/telegram"), fetch("/api/categories")]);
    setTelegram(await telegramResponse.json());
    const data = await categoriesResponse.json();
    setCategories(data.categories ?? [...STORAGE_CATEGORIES]);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const boundChannel = telegram?.channels.find((channel) => channel.category === category);

  return (
    <div className="pb-4">
      <TopBar title="Settings" />
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Library control</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your storage, your rules.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Connect Telegram once, then give every library its own channel.</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Refresh settings" title="Refresh settings" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="glass rounded-[26px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-medium text-muted-foreground">Connection</p><h2 className="mt-1 text-xl font-semibold">Telegram account</h2></div>
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-5 w-5" /></div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${telegram?.connected ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />{telegram?.connected ? "Connected and ready" : telegram?.configured ? "Session saved, reconnect needed" : "No session configured"}</div>
          {telegram?.lastError ? <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{telegram.lastError}</p> : null}
          <p className="mt-5 text-sm text-muted-foreground">Paste the encrypted string session generated on your machine. API credentials stay on the server.</p>
          <Input className="mt-4" placeholder="Telegram string session" value={sessionValue} onChange={(event) => setSessionValue(event.target.value)} />
          <Button className="mt-3 w-full sm:w-auto" disabled={!sessionValue.trim()} onClick={async () => {
            const response = await fetch("/api/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "session", stringSession: sessionValue }) });
            const data = await response.json();
            if (!response.ok) return toast.error(data.error);
            setSessionValue(""); toast.success("Telegram connected"); void refresh();
          }}>Save and connect</Button>
        </section>

        <section className="glass rounded-[26px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-medium text-muted-foreground">Organization</p><h2 className="mt-1 text-xl font-semibold">Libraries and channels</h2></div>
            <div className="rounded-2xl bg-accent p-3 text-accent-foreground"><Link2 className="h-5 w-5" /></div>
          </div>
          <div className="mt-5 flex gap-2">
            <Input placeholder="New library, e.g. Work" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
            <Button size="icon" aria-label="Add library" title="Add library" disabled={!newCategory.trim()} onClick={async () => {
              const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategory }) });
              const data = await response.json();
              if (!response.ok) return toast.error(data.error);
              setNewCategory(""); setCategory(data.category); toast.success("Library added"); void refresh();
            }}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
            <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{categoryLabel(item)}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Channel username or ID" value={peer} onChange={(event) => setPeer(event.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!peer.trim() || !telegram?.connected} onClick={async () => {
              const response = await fetch("/api/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bind", category, peer }) });
              const data = await response.json();
              if (!response.ok) return toast.error(data.error);
              setPeer(""); toast.success(`${categoryLabel(category)} channel linked`); void refresh();
            }}>Bind channel</Button>
            <Button variant="outline" disabled={syncing || !boundChannel} onClick={async () => {
              setSyncing(true);
              const response = await fetch("/api/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync", category }) });
              const data = await response.json(); setSyncing(false);
              if (!response.ok) return toast.error(data.error);
              toast.success(`Synced ${data.imported} new file${data.imported === 1 ? "" : "s"}`);
            }}>{syncing ? "Syncing..." : "Sync library"}</Button>
          </div>
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border/70">
            {categories.map((item) => {
              const channel = telegram?.channels.find((entry) => entry.category === item);
              return <button key={item} type="button" onClick={() => setCategory(item)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted/50"><span className="font-medium">{categoryLabel(item)}</span><span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">{channel ? <><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /><span className="truncate">{channel.title}</span></> : "Not linked"}</span></button>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
