// components/dashboard/PersonalDashComponents/SectionIntro.tsx

// title + short explanation at the top of each dashboard section,
// so it's clear what the section is for and how to use it
export default function SectionIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="font-mono text-xl font-bold tracking-wider">
        <span aria-hidden="true" className="mr-2 text-[#2f9e5b]">
          &gt;
        </span>
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-[#d9ffe6]/60">{children}</p>
    </div>
  );
}
