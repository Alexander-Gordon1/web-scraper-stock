// app/user/dashboard/page.tsx
"use client";

import { useState } from "react";
import TabNav from "@/app/user/components/dashboard/TabNav";
import PersonalDashboardTab from "@/app/user/components/dashboard/PersonalDashTab";
import PersonalFeedTab from "@/app/user/components/dashboard/PersonalFeedTab";
import ExploreFeedTab from "@/app/user/components/dashboard/ExploreFeedTab";
import AdminTab from "@/app/user/components/dashboard/AdminTab";

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: PersonalDashboardTab,
  "personal-feed": PersonalFeedTab,
  "explore-feed": ExploreFeedTab,
  admin: AdminTab,
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard"); // set the default active tab to "dashboard"
  // fall back to the dashboard for a tab that no longer exists (e.g. a removed tab kept by hot reload)
  const ActiveComponent = TAB_COMPONENTS[activeTab] ?? TAB_COMPONENTS.dashboard;

  return (
    <div>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="px-4 py-4 md:px-10">
        <ActiveComponent />
      </main>
    </div>
  );
}
