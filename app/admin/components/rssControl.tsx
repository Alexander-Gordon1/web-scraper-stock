// components/admin/rssControl.tsx
"use client";

// prices and news are now collected by the Pi itself, so there's nothing to trigger from here
export default function RSSControl() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">RSS Control</h1>
      <p>Prices and news are collected automatically by the home server.</p>
    </div>
  );
}
