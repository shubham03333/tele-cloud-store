"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { STORAGE_CATEGORIES } from "@/types";
import { CATEGORY_LABELS } from "@/lib/categories";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const [telegram, setTelegram] = useState<{
    configured: boolean;
    connected: boolean;
    lastError: string | null;
    channels: { category: string; title: string; peerId: string }[];
  } | null>(null);
  const [sessionValue, setSessionValue] = useState("");
  const [peer, setPeer] = useState("");
  const [category, setCategory] = useState<(typeof STORAGE_CATEGORIES)[number]>("files");
  const [syncing, setSyncing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [audit, setAudit] = useState<{
    sessions: { id: string; ipAddress: string | null; userAgent: string | null; current: boolean; createdAt: string }[];
    logins: { id: string; ipAddress: string; success: boolean; createdAt: string }[];
  } | null>(null);

  function refresh() {
    void fetch("/api/telegram")
      .then((response) => response.json())
      .then(setTelegram);
    void fetch("/api/audit")
      .then((response) => response.json())
      .then(setAudit);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <TopBar title="Settings" />
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        <section className="glass rounded-[24px] p-4 sm:p-5">
          <h2 className="text-lg font-medium">Telegram status</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            API ID and API hash stay in environment variables. Paste an encrypted-at-rest string session generated
            locally with GramJS / teleproto.
          </p>
          <p className="mt-3 text-sm">
            {telegram?.configured ? "Session saved" : "No session"} · {telegram?.connected ? "Connected" : "Disconnected"}
          </p>
          {telegram?.lastError ? <p className="mt-2 text-sm text-destructive">{telegram.lastError}</p> : null}
          <Input
            className="mt-4"
            placeholder="String session"
            value={sessionValue}
            onChange={(event) => setSessionValue(event.target.value)}
          />
          <Button
            className="mt-3"
            onClick={async () => {
              const response = await fetch("/api/telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "session", stringSession: sessionValue }),
              });
              const data = await response.json();
              if (!response.ok) {
                toast.error(data.error);
                return;
              }
              setSessionValue("");
              toast.success("Telegram session stored and encrypted");
              refresh();
            }}
          >
            Save session
          </Button>
        </section>

        <section className="glass rounded-[24px] p-4 sm:p-5">
          <h2 className="text-lg font-medium">Connected channels</h2>
          <p className="mt-1 text-sm text-muted-foreground">Each library maps to one private Telegram channel.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {telegram?.channels.map((channel) => (
              <li key={channel.category} className="flex justify-between gap-3">
                <span>{CATEGORY_LABELS[channel.category as keyof typeof CATEGORY_LABELS] ?? channel.category}</span>
                <span className="truncate text-muted-foreground">{channel.title}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2">
            <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {CATEGORY_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Channel username or ID" value={peer} onChange={(event) => setPeer(event.target.value)} />
            <Button
              variant="secondary"
              onClick={async () => {
                const response = await fetch("/api/telegram", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "bind", category, peer }),
                });
                const data = await response.json();
                if (!response.ok) {
                  toast.error(data.error);
                  return;
                }
                toast.success("Channel connected");
                refresh();
              }}
            >
              Bind channel
            </Button>
            <Button
              variant="outline"
              disabled={syncing || !telegram?.channels.some((channel) => channel.category === category)}
              onClick={async () => {
                setSyncing(true);
                const response = await fetch("/api/telegram", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "sync", category }),
                });
                const data = await response.json();
                setSyncing(false);
                if (!response.ok) {
                  toast.error(data.error);
                  return;
                }
                toast.success(`Synced ${data.imported} new file${data.imported === 1 ? "" : "s"}`);
              }}
            >
              {syncing ? "Syncing channel..." : "Sync channel files"}
            </Button>
          </div>
        </section>

        <section className="glass rounded-[24px] p-4 sm:p-5">
          <h2 className="text-lg font-medium">Password</h2>
          <Input
            className="mt-3"
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            className="mt-2"
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Button
            className="mt-3"
            onClick={async () => {
              const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
              if (result.error) {
                toast.error(result.error.message);
                return;
              }
              toast.success("Password updated");
              setCurrentPassword("");
              setNewPassword("");
            }}
          >
            Change password
          </Button>
        </section>

        <section className="glass rounded-[24px] p-4 sm:p-5">
          <h2 className="text-lg font-medium">Sessions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {audit?.sessions.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {item.ipAddress} · {item.current ? "this device" : "device"}
                </span>
                {!item.current ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await fetch(`/api/audit?sessionId=${item.id}`, { method: "DELETE" });
                      refresh();
                    }}
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <Button className="mt-4" variant="secondary" onClick={() => void authClient.signOut().then(() => location.assign("/login"))}>
            Sign out
          </Button>
        </section>

        <section className="glass rounded-[24px] p-4 sm:p-5">
          <h2 className="text-lg font-medium">Login history</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {audit?.logins.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.ipAddress}</span>
                <span className="text-muted-foreground">{formatDate(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-[24px] p-4 sm:p-5">
          <h2 className="text-lg font-medium">About</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Nimbus Drive is a single-user personal cloud. Files live in your private Telegram channels via the User
            API (MTProto). Metadata is stored locally. Telegram credentials never leave the server.
          </p>
        </section>
      </div>
    </div>
  );
}
