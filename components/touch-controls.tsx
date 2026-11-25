"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  REPEAT_DELAY_MS,
  REPEAT_MS,
  TOUCH_CONTROLS,
  type TouchButton,
} from "@/lib/touch-controls";

const COARSE_QUERY = "(pointer: coarse)";

function subscribeCoarse(onChange: () => void) {
  const mql = window.matchMedia(COARSE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getCoarseSnapshot() {
  return window.matchMedia(COARSE_QUERY).matches;
}

function getCoarseServerSnapshot() {
  return false;
}

function keyFromCode(code: string) {
  return code === "Space" ? " " : code;
}

function emit(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: keyFromCode(code),
      bubbles: true,
      cancelable: true,
    }),
  );
}

type Held = {
  pointerId: number;
  code: string;
  delay?: ReturnType<typeof setTimeout>;
  interval?: ReturnType<typeof setInterval>;
};

type Props = {
  gameId: string;
  disabled: boolean;
};

export function TouchControls({ gameId, disabled }: Props) {
  const coarse = useSyncExternalStore(
    subscribeCoarse,
    getCoarseSnapshot,
    getCoarseServerSnapshot,
  );
  const held = useRef<Map<string, Held>>(new Map());
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const release = useCallback((id: string) => {
    const entry = held.current.get(id);
    if (!entry) return;
    if (entry.delay) clearTimeout(entry.delay);
    if (entry.interval) clearInterval(entry.interval);
    held.current.delete(id);
    emit("keyup", entry.code);
  }, []);

  const releaseAll = useCallback(() => {
    for (const id of Array.from(held.current.keys())) release(id);
  }, [release]);

  // Al desactivar (pausa, fin, no listo) suelta todo lo retenido.
  useEffect(() => {
    if (disabled) releaseAll();
  }, [disabled, releaseAll]);

  // Al desmontar suelta todo lo retenido.
  useEffect(() => releaseAll, [releaseAll]);

  const onDown = (btn: TouchButton, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabledRef.current || held.current.has(btn.id)) return;
    e.preventDefault();

    if (btn.mode === "tap") {
      emit("keydown", btn.code);
      emit("keyup", btn.code);
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // el puntero ya no está activo; se ignora
    }

    const entry: Held = { pointerId: e.pointerId, code: btn.code };
    held.current.set(btn.id, entry);
    emit("keydown", btn.code);

    if (btn.mode === "repeat") {
      entry.delay = setTimeout(() => {
        emit("keydown", btn.code);
        entry.interval = setInterval(() => emit("keydown", btn.code), REPEAT_MS);
      }, REPEAT_DELAY_MS);
    }
  };

  const onUp = (btn: TouchButton, e: ReactPointerEvent<HTMLButtonElement>) => {
    const entry = held.current.get(btn.id);
    if (entry && entry.pointerId === e.pointerId) release(btn.id);
  };

  const buttons = TOUCH_CONTROLS[gameId];
  if (!coarse || !buttons || buttons.length === 0) return null;

  const renderGroup = (side: TouchButton["side"]) => (
    <div className="touch-group" data-side={side}>
      {buttons
        .filter((b) => b.side === side)
        .map((btn) => (
          <button
            key={btn.id}
            type="button"
            className="touch-btn"
            data-mode={btn.mode}
            aria-label={btn.ariaLabel}
            aria-disabled={disabled}
            onPointerDown={(e) => onDown(btn, e)}
            onPointerUp={(e) => onUp(btn, e)}
            onPointerCancel={(e) => onUp(btn, e)}
            onLostPointerCapture={(e) => onUp(btn, e)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {btn.label}
          </button>
        ))}
    </div>
  );

  return (
    <div
      className="touch-controls"
      data-disabled={disabled}
      role="group"
      aria-label="Controles táctiles"
    >
      {renderGroup("left")}
      {renderGroup("right")}
    </div>
  );
}
