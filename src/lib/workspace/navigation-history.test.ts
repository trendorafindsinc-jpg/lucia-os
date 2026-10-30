import { afterEach, describe, expect, it, vi } from "vitest";
import { installContinuityHistory } from "./navigation-history";
afterEach(() => vi.unstubAllGlobals());
function browser() {
  let listener:
    | ((event: {
        state: unknown;
        stopImmediatePropagation: () => void;
      }) => void)
    | null = null;
  const history = {
    state: { __NA: true, next: "preserved" },
    pushState: vi.fn(),
    replaceState: vi.fn(),
    go: vi.fn(),
  };
  vi.stubGlobal("history", history);
  vi.stubGlobal("window", {
    addEventListener: (_name: string, fn: typeof listener) => (listener = fn),
    removeEventListener: () => (listener = null),
  });
  return {
    history,
    pop: (index: number) => {
      const e = {
        state: { __luciaContinuityIndex: index },
        stopImmediatePropagation: vi.fn(),
      };
      listener?.(e);
      return e;
    },
  };
}
describe("Next-compatible Back and Forward coordination", () => {
  it("preserves Next history state and stamps push/replace entries", () => {
    const b = browser();
    const stop = installContinuityHistory({
      shouldBlock: () => false,
      confirm: () => {},
    });
    expect(b.history.replaceState).toBeTypeOf("function");
    history.pushState({ __NA: true, tree: "next" }, "", "/templates");
    history.replaceState(
      { __NA: true, tree: "next" },
      "",
      "/workspace/settings",
    );
    expect(b.pop(0).stopImmediatePropagation).not.toHaveBeenCalled();
    stop();
  });
  it("uses the outgoing history route even if the address bar already changed", () => {
    const b = browser();
    const loc = {
      pathname: "/editor",
      search: "?template=northstar-consulting",
    };
    vi.stubGlobal("location", loc);
    const shouldBlock = vi.fn(() => false);
    installContinuityHistory({ shouldBlock, confirm: vi.fn() });
    loc.pathname = "/workspace/websites";
    loc.search = "";
    history.pushState({}, "", "/workspace/websites");
    loc.pathname = "/editor";
    history.replaceState(
      { __luciaContinuityIndex: 0, __NA: true },
      "",
      "/editor",
    );
    b.pop(0);
    expect(shouldBlock).toHaveBeenCalledWith("/workspace/websites");
  });
  it("rolls back a destructive Back before confirmation and remains on Cancel", () => {
    const b = browser();
    const confirm = vi.fn();
    installContinuityHistory({ shouldBlock: () => true, confirm });
    history.pushState({}, "", "/editor");
    const e = b.pop(0);
    expect(e.stopImmediatePropagation).toHaveBeenCalled();
    expect(b.history.go).toHaveBeenCalledWith(1);
    b.pop(1);
    expect(confirm).toHaveBeenCalledOnce();
    expect(b.history.go).toHaveBeenCalledTimes(1);
  });
  it("replays the original history operation only after the protected decision", () => {
    const b = browser();
    let replay: (() => void) | undefined;
    installContinuityHistory({
      shouldBlock: () => true,
      confirm: (run) => (replay = run),
    });
    history.pushState({}, "", "/editor");
    b.pop(0);
    b.pop(1);
    replay?.();
    expect(b.history.go).toHaveBeenLastCalledWith(-1);
    expect(b.pop(0).stopImmediatePropagation).not.toHaveBeenCalled();
  });
  it("does not block ordinary recoverable navigation or unrelated history entries", () => {
    const b = browser();
    installContinuityHistory({ shouldBlock: () => false, confirm: vi.fn() });
    history.pushState({}, "", "/templates");
    expect(b.pop(0).stopImmediatePropagation).not.toHaveBeenCalled();
  });
});
