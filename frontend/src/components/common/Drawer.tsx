import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { clsx } from "clsx";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: "right" | "left";
  width?: "sm" | "md" | "lg" | "xl";
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  position = "right",
  width = "md",
}) => {
  const widthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  const posStyles = {
    right: "right-0 top-0 bottom-0 animate-in slide-in-from-right duration-200",
    left: "left-0 top-0 bottom-0 animate-in slide-in-from-left duration-200",
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 animate-in fade-in-0 duration-150" />
        <Dialog.Content
          className={clsx(
            "fixed w-full h-full bg-[#111C2D] border-[#1F2E47] shadow-2xl z-50 flex flex-col focus:outline-none text-slate-100",
            position === "right" ? "border-l" : "border-r",
            widthStyles[width],
            posStyles[position]
          )}
        >
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#1F2E47] shrink-0 bg-[#0E1624]">
            <div>
              <Dialog.Title className="text-lg font-bold text-white tracking-tight font-sans">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-xs sm:text-sm text-slate-400 mt-0.5 font-sans">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#16253B] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-6">{children}</div>

          {footer && (
            <div className="px-6 py-4 bg-[#0D1624] border-t border-[#1F2E47] shrink-0 flex items-center justify-end gap-3 font-sans">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

