import { useCallback, useEffect, useRef } from "react";

const holdDuration = 380;

// Ignore the release click after a hold, and cancel holds when dragging or scrolling.
export default function useFeatureSelectionGesture(onSelect, onPreview) {
  const pending = useRef(null);
  const suppressClick = useRef(false);
  const lastHold = useRef(-Infinity);
  const cancel = useCallback(() => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
  }, []);
  useEffect(() => cancel, [onSelect, cancel]);
  const cancelGesture = () => {
    if (pending.current) {
      cancel();
      suppressClick.current = true;
    }
  };

  return {
    onPointerDown: event => {
      cancel();
      suppressClick.current = false;
      if (!onSelect || event.isPrimary === false || (typeof event.button === "number" && event.button !== 0)) return;
      pending.current = {x:event.clientX || 0, y:event.clientY || 0, timer:setTimeout(() => {
        pending.current = null;
        suppressClick.current = true;
        lastHold.current = Date.now();
        onSelect({additive:true});
      }, holdDuration)};
    },
    onPointerMove: event => {
      if (pending.current && Math.hypot((event.clientX || 0) - pending.current.x, (event.clientY || 0) - pending.current.y) > 8) cancelGesture();
    },
    onPointerUp: cancel,
    onPointerCancel: cancelGesture,
    onPointerLeave: cancelGesture,
    onClick: event => {
      if (suppressClick.current) {
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      } else onSelect?.(event);
    },
    onDoubleClick: event => {
      if (Date.now() - lastHold.current < holdDuration) event.preventDefault();
      else onPreview?.(event);
    },
    onContextMenu: event => {
      if (Date.now() - lastHold.current < holdDuration) event.preventDefault();
    },
  };
}
