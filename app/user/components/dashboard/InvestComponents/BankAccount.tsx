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
  "rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-[#9085e9] focus:outline-none";

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
      <h2 className="text-lg font-semibold">Bank account</h2>

      {loading && <p className="text-[#E5EAF5]/60">Loading bank account…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {account && (
        <div className="rounded-lg border border-white/10 bg-[#494D5F]/40 p-4">
          <p className="text-sm text-[#E5EAF5]/60">Balance</p>
          <p className="font-mono text-[32px] text-white">${Number(account.balance).toFixed(2)}</p>
        </div>
      )}

      {account && !editing && (
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#494D5F]/40 p-4">
          <dl className="flex flex-col gap-3">
            {details.map((detail) => (
              <div key={detail.label} className="flex justify-between gap-4">
                <dt className="text-[#E5EAF5]/60">{detail.label}</dt>
                <dd className="text-white">{detail.value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={startEditing}
            className="self-end rounded-md bg-[#9085e9] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#7b6fe0]"
          >
            Edit details
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#494D5F]/40 p-4"
        >
          {!account && <p className="text-[#E5EAF5]/60">Enter your bank details to open an account.</p>}

          <label className="flex flex-col gap-1 text-sm text-[#E5EAF5]/80">
            Bank name
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
              maxLength={100}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-[#E5EAF5]/80">
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
                className="rounded-md px-3 py-1.5 text-sm text-[#E5EAF5]/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#9085e9] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#7b6fe0] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
