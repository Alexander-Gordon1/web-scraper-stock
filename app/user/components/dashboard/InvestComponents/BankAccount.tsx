"use client";

import { useEffect, useState } from "react";

// one row of the bank_accounts table
type Account = {
  bank_name: string;
  account_number: string | null;
  balance: number | string;
  created_at: string;
};

const inputClass =
  "rounded-md border border-[#2f9e5b]/30 bg-black/20 px-3 py-2 text-[#d9ffe6] caret-[#2f9e5b] focus:border-[#2f9e5b] focus:shadow-[0_0_14px_rgba(47,158,91,0.35)] focus:outline-none";

// the logged-in user's bank account: balance, details, and a form to enter or change the details
export default function BankAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form state: editing is forced on when there's no account yet
  const [editing, setEditing] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch("/user/api/bankAccount")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAccount(data.account);
      })
      .catch((err: Error) => setError(err.message || "Failed to load bank account."))
      .finally(() => setLoading(false));
  }, []);

  function startEditing() {
    setBankName(account?.bank_name ?? "");
    setAccountNumber(account?.account_number ?? "");
    setFormError("");
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/user/api/bankAccount", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank_name: bankName, account_number: accountNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccount(data.account);
      setEditing(false);
    } catch (err) {
      setFormError((err as Error).message || "Failed to save bank account.");
    } finally {
      setSaving(false);
    }
  }

  const showForm = editing || (!loading && !error && !account);

  const details = account
    ? [
        { label: "Bank", value: account.bank_name },
        { label: "Account number", value: account.account_number ?? "—" },
        { label: "Opened", value: new Date(account.created_at).toLocaleDateString() },
      ]
    : [];

  return (
    <section className="flex max-w-[380px] flex-col gap-4">
      <h2 className="font-mono text-lg font-bold tracking-wider">Bank account</h2>

      {loading && <p className="text-[#d9ffe6]/60">Loading bank account…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {account && (
        <div className="rounded-md border border-[#2f9e5b]/30 bg-[#2f9e5b]/10 p-4">
          <p className="text-sm text-[#d9ffe6]/60">Balance</p>
          <p className="font-mono text-[32px] text-[#d9ffe6]">${Number(account.balance).toFixed(2)}</p>
        </div>
      )}

      {account && !editing && (
        <div className="flex flex-col gap-3 rounded-md border border-[#2f9e5b]/30 bg-[#2f9e5b]/10 p-4">
          <dl className="flex flex-col gap-3">
            {details.map((detail) => (
              <div key={detail.label} className="flex justify-between gap-4">
                <dt className="text-[#d9ffe6]/60">{detail.label}</dt>
                <dd className="text-[#d9ffe6]">{detail.value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={startEditing}
            className="self-end rounded-md border border-[#2f9e5b] bg-[#2f9e5b]/15 px-4 py-1.5 text-sm font-mono font-bold uppercase tracking-widest text-[#d9ffe6] transition hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_14px_rgba(47,158,91,0.45)]"
          >
            Edit details
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-3 rounded-md border border-[#2f9e5b]/30 bg-[#2f9e5b]/10 p-4"
        >
          {!account && <p className="text-[#d9ffe6]/60">Enter your bank details to open an account.</p>}

          <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.2em] text-[#2f9e5b]">
            Bank name
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
              maxLength={100}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.2em] text-[#2f9e5b]">
            Account number
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              maxLength={34}
              className={`${inputClass} font-mono`}
            />
          </label>

          {formError && <p className="text-sm text-red-400">{formError}</p>}

          <div className="flex justify-end gap-2">
            {account && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md px-3 py-1.5 text-sm text-[#d9ffe6]/70 transition-colors hover:bg-[#2f9e5b]/10 hover:text-[#d9ffe6]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md border border-[#2f9e5b] bg-[#2f9e5b]/15 px-4 py-1.5 text-sm font-mono font-bold uppercase tracking-widest text-[#d9ffe6] transition hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_14px_rgba(47,158,91,0.45)] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
