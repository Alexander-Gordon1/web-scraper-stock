// components/admin/rssControl.tsx
"use client";
import Link from "next/link";




export default function RSSControl() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">RSS Control</h1>
      <p>Manage your RSS feeds and settings here.</p>
      {/* Add more controls and settings for RSS feeds as needed */}


      <div >
        <button
          onClick={
            async () => {
            const res = await fetch('/admin/api/yahooRSS', { headers: {'Authorization': process.env.CronJob || ''}});
            }
          }
          title="Ingest RSS"
          color="red"
          className="px-10 py-4 bg-red-500 text-black rounded-md hover:bg-primary-dark transition-colors active:bg-red-700"
        >
          Ingest RSS
        </button>
      </div>
    </div>
    
    




  );
}

