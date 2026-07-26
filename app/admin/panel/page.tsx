// app/admin/panel/page.tsx
"use client";

import { useState } from "react";
import TabNav from "@/app/admin/components/AdminTabNav";

import controlPanelTab from "@/app/admin/components/controlPanel";
import AdminAccountsTab from "@/app/admin/components/accounts";
import scrapers from "@/app/admin/components/scrapers";
import RssControl from "@/app/admin/components/rssControl";

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  accounts: AdminAccountsTab,
  controlPanel: controlPanelTab,
  scrapers: scrapers,
  rssControl: RssControl,
};

export default function PanelPage() {
  const [activeTab, setActiveTab] = useState("controlPanel"); // set the default active tab to "controlPanel"
  const AdminActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main>
        <AdminActiveComponent />
      </main>
    </div>
  );
}
