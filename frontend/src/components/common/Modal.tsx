import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { clsx } from "clsx";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = "lg",
}) => {
  const widthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 animate-in fade-in-0 duration-150" />
        <Dialog.Content
          className={clsx(
            "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full p-0 bg-[#111C2D] border border-[#1F2E47] shadow-2xl rounded-2xl z-50 focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150 text-slate-100",
            widthStyles[maxWidth]
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2E47]">
            <div>
              <Dialog.Title className="text-lg font-bold text-white font-sans tracking-tight">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
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

          <div className="p-6">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1F2E47] bg-[#0D1624] rounded-b-2xl">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

