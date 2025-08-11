import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";

type PromptOptions = {
  title?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  okText?: string;
  cancelText?: string;
  required?: boolean;          // 是否必填
};
type Resolver = (value: string | null) => void;

const PromptContext = createContext<(opts: PromptOptions) => Promise<string | null>>(
  async () => null
);

export const usePrompt = () => useContext(PromptContext);

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<PromptOptions>({});
  const [value, setValue] = useState("");
  const resolverRef = useRef<Resolver | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  const resolveAndClose = useCallback((v: string | null) => {
    resolverRef.current?.(v);
    resolverRef.current = null;
    setOpen(false);
    setValue("");
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    setOpts(options);
    setValue(options.defaultValue ?? "");
    setOpen(true);
    return new Promise<string | null>((res) => (resolverRef.current = res));
  }, []);

  const onSubmit = useCallback(() => {
    if (opts.required && !value.trim()) return;
    resolveAndClose(value);
  }, [opts.required, value, resolveAndClose]);

  const ctx = useMemo(() => prompt, [prompt]);

  return (
    <PromptContext.Provider value={ctx}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && resolveAndClose(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white">
          <DialogHeader>
            <DialogTitle>{opts.title ?? "请输入"}</DialogTitle>
            {opts.description && (
              <DialogDescription>{opts.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="py-2">
            <Input
              ref={inputRef}
              placeholder={opts.placeholder ?? "在此输入…"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
                if (e.key === "Escape") resolveAndClose(null);
              }}
            />
            {opts.required && !value.trim() && (
              <p className="mt-2 text-xs text-destructive">该字段为必填</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => resolveAndClose(null)}>
              {opts.cancelText ?? "取消"}
            </Button>
            <Button onClick={onSubmit} disabled={opts.required && !value.trim()}>
              {opts.okText ?? "确定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PromptContext.Provider>
  );
}
