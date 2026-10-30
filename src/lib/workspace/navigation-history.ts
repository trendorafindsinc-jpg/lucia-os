/** Augments Next history entries without replacing its router or discarding its state. */
export function installContinuityHistory(options: {
  shouldBlock: (outgoingHref: string) => boolean;
  confirm: (replay: () => void, outgoingHref: string) => void;
}) {
  const key = "__luciaContinuityIndex";
  const initial = history.state?.[key];
  let index = Number.isSafeInteger(initial) ? initial : 0;
  const href = () =>
    typeof location === "undefined" ? "" : location.pathname + location.search;
  const entries = new Map<number, string>([[index, href()]]);
  const push = history.pushState.bind(history),
    replace = history.replaceState.bind(history);
  replace({ ...history.state, [key]: index }, "");
  const patchedPush: History["pushState"] = (data, title, url) => {
    index++;
    push({ ...data, [key]: index }, title, url);
    entries.set(index, href());
  };
  const patchedReplace: History["replaceState"] = (data, title, url) => {
    // Next can replace the destination entry before our pop listener runs.
    // Preserve its existing index and the outgoing entry's route in that case.
    if (Number.isSafeInteger(data?.[key]) && data[key] !== index) {
      replace(data, title, url);
      return;
    }
    replace({ ...data, [key]: index }, title, url);
    entries.set(index, href());
  };
  history.pushState = patchedPush;
  history.replaceState = patchedReplace;
  let reverting = false,
    allowReplay = false;
  let request: (() => void) | null = null;
  const onPop = (event: PopStateEvent) => {
    const target = event.state?.[key];
    if (!Number.isSafeInteger(target)) return;
    if (reverting) {
      event.stopImmediatePropagation();
      reverting = false;
      const next = request;
      request = null;
      next?.();
      return;
    }
    if (allowReplay) {
      allowReplay = false;
      index = target;
      return;
    }
    const outgoingHref = entries.get(index) ?? "";
    if (!options.shouldBlock(outgoingHref)) {
      index = target;
      return;
    }
    const delta = target - index;
    if (!delta) return;
    event.stopImmediatePropagation();
    reverting = true;
    request = () =>
      options.confirm(() => {
        allowReplay = true;
        history.go(delta);
      }, outgoingHref);
    history.go(-delta);
  };
  window.addEventListener("popstate", onPop, true);
  return () => {
    window.removeEventListener("popstate", onPop, true);
    if (history.pushState === patchedPush) history.pushState = push;
    if (history.replaceState === patchedReplace) history.replaceState = replace;
  };
}
