import { useState } from "react";

export function Tabs({
  tabs,
  defaultIndex = 0,
}: {
  tabs: { label: string; content: React.ReactNode }[];
  defaultIndex?: number;
}) {
  const [active, setActive] = useState(defaultIndex);

  return (
    <div className="w-full">
      <div className="flex border-b mb-4">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={`px-4 py-2 font-medium ${
              idx === active
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[active]?.content}</div>
    </div>
  );
}
