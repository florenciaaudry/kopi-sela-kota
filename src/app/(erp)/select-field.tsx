"use client";

import { odooLabel } from "@/lib/erp-terminology";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectFieldProps = {
  label: string;
  name: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (nextValue: string) => void;
};

export function SelectField({
  label: sourceLabel,
  name,
  options,
  placeholder = "Pilih…",
  required = true,
  disabled = false,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
}: SelectFieldProps) {
  const label = odooLabel(sourceLabel);
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const currentValue = isControlled ? controlledValue : internalValue;
  const selectedOption = options.find((item) => item.value === currentValue);

  useEffect(() => {
    if (!open) return;

    const handlePointerDownOutside = (event: MouseEvent | PointerEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form || !required || disabled) return;

    const handleSubmit = (event: Event) => {
      if (!currentValue) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
        triggerRef.current?.focus();
      }
    };

    form.addEventListener("submit", handleSubmit, true);
    return () => {
      form.removeEventListener("submit", handleSubmit, true);
    };
  }, [currentValue, disabled, required]);

  function selectValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      className="demo-field custom-select-field"
      ref={containerRef}
      style={{ position: "relative" }}
    >
      <label
        id={`${id}-label`}
        className="custom-select-label"
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) {
            triggerRef.current?.focus();
            setOpen((prev) => !prev);
          }
        }}
      >
        {label}
      </label>
      <div className="custom-select" style={{ position: "relative", width: "100%" }}>
        <input
          type="hidden"
          name={name}
          value={currentValue}
          disabled={disabled}
        />
        <button
          ref={triggerRef}
          id={`${id}-trigger`}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          aria-labelledby={`${id}-label`}
          disabled={disabled}
          className={`custom-select-trigger${selectedOption ? " has-value" : " is-placeholder"}${open ? " is-open" : ""}`}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!disabled) {
              setOpen((prev) => !prev);
            }
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }
              const enabledOptions = options.filter((opt) => !opt.disabled);
              if (!enabledOptions.length) return;
              const currentIndex = enabledOptions.findIndex(
                (opt) => opt.value === currentValue
              );
              const delta = event.key === "ArrowDown" ? 1 : -1;
              const nextIndex =
                currentIndex === -1
                  ? 0
                  : (currentIndex + delta + enabledOptions.length) %
                    enabledOptions.length;
              selectValue(enabledOptions[nextIndex].value);
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
        >
          <span className="custom-select-value" style={{ pointerEvents: "none" }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span
            className="custom-select-chevron"
            aria-hidden="true"
            style={{ pointerEvents: "none" }}
          >
            ▾
          </span>
        </button>

        {open && !disabled ? (
          <div
            id={`${id}-listbox`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="custom-select-menu"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 100,
              pointerEvents: "auto",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {options.length === 0 ? (
              <div className="custom-select-empty">
                Tidak ada pilihan tersedia
              </div>
            ) : (
              options.map((item) => {
                const isSelected = item.value === currentValue;
                return (
                  <button
                    key={`${item.value}-${item.label}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={item.disabled}
                    className={`custom-select-option${isSelected ? " is-selected" : ""}`}
                    style={{
                      width: "100%",
                      cursor: item.disabled ? "not-allowed" : "pointer",
                      pointerEvents: "auto",
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!item.disabled) {
                        selectValue(item.value);
                      }
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!item.disabled) {
                        selectValue(item.value);
                      }
                    }}
                  >
                    <span style={{ pointerEvents: "none" }}>{item.label}</span>
                    {isSelected ? (
                      <span
                        className="custom-select-check"
                        aria-hidden="true"
                        style={{ pointerEvents: "none" }}
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
