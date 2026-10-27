// components/pi5/Pi5View.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// GET /user/api/pi5System → the Pi's /system endpoint. any sensor that can't be read is null
type Level = "ok" | "warn" | "crit";
type Disk = { mounted: boolean; used_pct?: number | null; free_gb?: number | null; total_gb?: number | null };
type Collector = { minutes_since_ok: number | null; last_run_failed: boolean | null } | null;
type SystemReading = {
  status: Level;
  checks: { name: string; status: Level; detail: string }[];
  temperatures: { cpu_c: number | null; rp1_c: number | null };
  fan: { rpm: number | null };
  cpu: { usage_pct: number | null; freq_mhz: number | null; load: Record<string, number | null> | null };
  memory: {
    used_pct: number | null;
    available_mb: number | null;
    total_mb: number | null;
    swap_used_mb?: number | null;
    swap_total_mb?: number | null;
  };
  disks: Record<string, Disk>;
  database: { status: "ok" | "down"; size_mb: number | null; latency_ms: number | null };
  collector: { finnhub: Collector; rss: Collector } | null; // null while the database is down
  tunnel: { connected: boolean | null; connections?: number | null };
  uptime_s: number | null;
  booted_at: string | null;
  checked_at: string;
};

const POLL_MS = 15_000; // each reading takes ~0.3s on the Pi, so 15s is plenty
const CPU_WARN_C = 70;
const CPU_CRIT_C = 80;
const CORES = 4;

const DISK_LABELS: Record<string, string> = { sd_card: "SD card", database: "Database", shared: "Shared" };
// how often each collector is meant to succeed
const COLLECTORS = [
  { key: "finnhub", label: "Prices (Finnhub)", everyMin: 1 },
  { key: "rss", label: "News (RSS)", everyMin: 10 },
] as const;

const LEVEL_STYLE: Record<Level, { text: string; bar: string; border: string; icon: string }> = {
  ok: { text: "text-[#2f9e5b]", bar: "bg-[#2f9e5b]", border: "border-[#2f9e5b]/60", icon: "✓" },
  warn: { text: "text-amber-400", bar: "bg-amber-400", border: "border-amber-400/60", icon: "!" },
  crit: { text: "text-red-400", bar: "bg-red-400", border: "border-red-400/60", icon: "✕" },
};

// null → "—"
function fmt(value: number | null | undefined, unit = "", digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

function fmtUptime(seconds: number | null) {
  if (seconds === null) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function Badge({ level, label }: { level: Level; label?: string }) {
  const style = LEVEL_STYLE[level] ?? LEVEL_STYLE.warn;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border bg-black/30 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest ${style.border} ${style.text}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {label ?? level}
    </span>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-4 rounded-md border border-[#2f9e5b]/30 bg-[#2f9e5b]/10 p-4 ${className}`}>
      <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#2f9e5b]">{title}</h2>
      {children}
    </section>
  );
}

// label + value, with an optional bar underneath for percentages
function Meter({
  label,
  value,
  pct,
  level = "ok",
  sub,
}: {
  label: string;
  value: string;
  pct?: number | null;
  level?: Level;
  sub?: string;
}) {
  const hasBar = pct !== undefined;
  const width = pct === null || pct === undefined ? 0 : Math.min(100, Math.max(0, pct));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-[#d9ffe6]/60">{label}</span>
        <span className="font-mono text-xl text-[#d9ffe6]">{value}</span>
      </div>
      {hasBar && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-black/40"
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct ?? undefined}
        >
          <div className={`h-full rounded-full transition-[width] duration-500 ${LEVEL_STYLE[level].bar}`} style={{ width: `${width}%` }} />
        </div>
      )}
      {sub && <span className="font-mono text-xs text-[#d9ffe6]/50">{sub}</span>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-[#d9ffe6]/60">{label}</dt>
      <dd className="text-right font-mono text-[#d9ffe6]">{children}</dd>
    </div>
  );
}

// live health of the Raspberry Pi 5 that runs the stock API, refreshed every 15s while the tab is visible
export default function Pi5View() {
  const [reading, setReading] = useState<SystemReading | null>(null);
  const [offline, setOffline] = useState(false);
  const [denied, setDenied] = useState(""); // not logged in: stop polling
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch("/user/api/pi5System", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        setDenied(data?.error ?? "You can't view the Pi.");
        return;
      }
      // the Pi or tunnel being down comes back as { error }, with a 502 or Cloudflare's HTML page
      if (!res.ok || !data || data.error || !data.status) {
        setOffline(true);
        return;
      }
      setReading(data);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (denied) return;
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    // catch up straight away when the tab comes back into view
    const onVisible = () => !document.hidden && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, denied]);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-[#d9ffe6]">
          <span className="text-[#2f9e5b]">&gt;</span> Pi 5
        </h1>
        {offline ? <Badge level="crit" label="Pi offline" /> : reading && <Badge level={reading.status} />}
      </div>
      {!denied && (
        <div className="flex items-center gap-3 font-mono text-xs text-[#d9ffe6]/50">
          {reading && <span>Reading {new Date(reading.checked_at).toLocaleTimeString()}</span>}
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="rounded-md border border-[#2f9e5b] bg-[#2f9e5b]/15 px-3 py-1 font-bold uppercase tracking-widest text-[#d9ffe6] transition hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_14px_rgba(47,158,91,0.45)] disabled:opacity-50"
          >
            {refreshing ? "Checking…" : "Refresh"}
          </button>
        </div>
      )}
    </div>
  );

  if (denied) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <p className="text-red-400">{denied}</p>
      </div>
    );
  }

  if (loading && !reading) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <p className="text-[#d9ffe6]/60">Contacting the Pi…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}

      {offline && (
        <div className="rounded-md border border-red-400/60 bg-red-950/30 p-4 font-mono text-sm text-red-300">
          Can&apos;t reach the Pi. It may be powered off or the Cloudflare tunnel is down. Retrying every{" "}
          {POLL_MS / 1000}s{reading && " — the figures below are the last reading"}.
        </div>
      )}

      {reading && <Readings reading={reading} stale={offline} />}
    </div>
  );
}

function Readings({ reading, stale }: { reading: SystemReading; stale: boolean }) {
  const { temperatures, fan, cpu, memory, disks, database, collector, tunnel } = reading;

  const cpuTemp = temperatures?.cpu_c ?? null;
  const cpuTempLevel: Level = cpuTemp === null ? "ok" : cpuTemp >= CPU_CRIT_C ? "crit" : cpuTemp >= CPU_WARN_C ? "warn" : "ok";
  const loads = Object.entries(cpu?.load ?? {});
  const swapPct =
    memory?.swap_used_mb != null && memory?.swap_total_mb ? (memory.swap_used_mb / memory.swap_total_mb) * 100 : null;
  const dbDown = database?.status !== "ok";

  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${stale ? "opacity-50" : ""}`}>
      <Card title="Temperature">
        <Meter
          label="CPU"
          value={fmt(cpuTemp, "°C", 1)}
          pct={cpuTemp === null ? null : (cpuTemp / 90) * 100}
          level={cpuTempLevel}
          sub={`warn ${CPU_WARN_C}°C · crit ${CPU_CRIT_C}°C`}
        />
        <Meter label="I/O chip (RP1)" value={fmt(temperatures?.rp1_c, "°C", 1)} />
        <Meter label="Fan" value={fmt(fan?.rpm, " rpm")} sub={fan?.rpm === 0 ? "off — normal while cool" : undefined} />
      </Card>

      <Card title="CPU">
        <Meter label="Usage" value={fmt(cpu?.usage_pct, "%", 1)} pct={cpu?.usage_pct ?? null} />
        <Meter label="Clock" value={fmt(cpu?.freq_mhz, " MHz")} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-[#d9ffe6]/60">Load average ({CORES} = every core busy)</span>
          <div className="grid grid-cols-3 gap-2">
            {(loads.length ? loads : [["1m", null], ["5m", null], ["15m", null]] as [string, null][]).map(
              ([window, value]) => (
                <div key={window} className="rounded-md bg-black/30 px-2 py-1.5 text-center">
                  <div className="font-mono text-lg text-[#d9ffe6]">{fmt(value, "", 2)}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#d9ffe6]/50">{window}</div>
                </div>
              ),
            )}
          </div>
        </div>
      </Card>

      <Card title="Memory">
        <Meter
          label="RAM used"
          value={fmt(memory?.used_pct, "%", 1)}
          pct={memory?.used_pct ?? null}
          sub={`${fmt(memory?.available_mb, " MB")} free of ${fmt(memory?.total_mb, " MB")}`}
        />
        <Meter
          label="Swap used"
          value={`${fmt(memory?.swap_used_mb, " MB")}`}
          pct={swapPct}
          sub={`of ${fmt(memory?.swap_total_mb, " MB")}`}
        />
      </Card>

      <Card title="Storage">
        {Object.entries(disks ?? {}).map(([key, disk]) =>
          disk.mounted ? (
            <Meter
              key={key}
              label={DISK_LABELS[key] ?? key}
              value={fmt(disk.used_pct, "%", 1)}
              pct={disk.used_pct ?? null}
              sub={`${fmt(disk.free_gb, " GB", 1)} free of ${fmt(disk.total_gb, " GB", 1)}`}
            />
          ) : (
            <div key={key} className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-[#d9ffe6]/60">{DISK_LABELS[key] ?? key}</span>
              <Badge level="crit" label="Not mounted" />
            </div>
          ),
        )}
      </Card>

      <Card title="Database & collectors">
        <dl className="flex flex-col gap-3">
          <Row label="Postgres">
            <Badge level={dbDown ? "crit" : "ok"} label={dbDown ? "Down" : "Up"} />
          </Row>
          <Row label="Size">{fmt(database?.size_mb, " MB", 1)}</Row>
          <Row label="Response time">{fmt(database?.latency_ms, " ms", 1)}</Row>
        </dl>
        <div className="flex flex-col gap-3 border-t border-[#2f9e5b]/20 pt-3">
          {collector === null || collector === undefined ? (
            <p className="text-sm text-[#d9ffe6]/50">Collector status is unavailable while the database is down.</p>
          ) : (
            COLLECTORS.map(({ key, label, everyMin }) => {
              const c = collector[key];
              const mins = c?.minutes_since_ok ?? null;
              // more than two missed runs counts as late
              const level: Level = c?.last_run_failed ? "crit" : mins === null || mins > everyMin * 2 ? "warn" : "ok";
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[#d9ffe6]/60">{label}</span>
                    <Badge level={level} label={c?.last_run_failed ? "Last run failed" : level === "ok" ? "On time" : "Late"} />
                  </div>
                  <span className="font-mono text-xs text-[#d9ffe6]/50">
                    last success {mins === null ? "—" : `${fmt(mins, "", mins < 10 ? 1 : 0)} min ago`} · runs every{" "}
                    {everyMin === 1 ? "minute" : `${everyMin} min`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card title="System">
        <dl className="flex flex-col gap-3">
          <Row label="Cloudflare tunnel">
            {tunnel?.connected === null || tunnel?.connected === undefined ? (
              "—"
            ) : (
              <Badge
                level={tunnel.connected ? "ok" : "crit"}
                label={
                  tunnel.connected
                    ? `Connected${tunnel.connections != null ? ` · ${tunnel.connections}` : ""}`
                    : "Disconnected"
                }
              />
            )}
          </Row>
          <Row label="Uptime">{fmtUptime(reading.uptime_s)}</Row>
          <Row label="Booted">{fmtTime(reading.booted_at)}</Row>
          <Row label="Reading taken">{fmtTime(reading.checked_at)}</Row>
        </dl>
      </Card>

      <Card title="Health checks" className="md:col-span-2 xl:col-span-3">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
          {(reading.checks ?? []).map((check) => (
            <li
              key={check.name}
              className="flex items-center justify-between gap-4 border-b border-[#2f9e5b]/15 pb-2 last:border-b-0"
            >
              <span className="text-sm text-[#d9ffe6]">{check.name}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#d9ffe6]/60">{check.detail}</span>
                <Badge level={check.status} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
