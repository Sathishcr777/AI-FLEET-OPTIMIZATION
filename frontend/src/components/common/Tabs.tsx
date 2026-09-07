import React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { clsx } from "clsx";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}) => {
  const initialValue = defaultValue || (items.length > 0 ? items[0].value : "");

  return (
    <RadixTabs.Root
      value={value}
      defaultValue={initialValue}
      onValueChange={onValueChange}
      className={clsx("flex flex-col", className)}
    >
      <RadixTabs.List className="flex items-center gap-2 border-b border-[#1F2E47] pb-px">
        {items.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 data-[state=active]:font-semibold transition-all focus:outline-none cursor-pointer"
          >
            {tab.label}
            {tab.badge}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>

      {items.map((tab) => (
        <RadixTabs.Content
          key={tab.value}
          value={tab.value}
          className="pt-4 focus:outline-none animate-in fade-in-50 duration-100"
        >
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
};

