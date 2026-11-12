"use client";
import React, { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Navigation = { href: string; navigate: (href: string) => void };
const AppNavigation = createContext<Navigation | null>(null);
export function AppNavigationProvider({ value, children }: { value: Navigation; children: ReactNode }) {
  return <AppNavigation.Provider value={value}>{children}</AppNavigation.Provider>;
}
export function useAppSearch() {
  const navigation = useContext(AppNavigation);
  const search = useSearchParams();
  return navigation ? new URL(navigation.href, "https://workspace.invalid").search : search.toString();
}
export function WorkspaceAppLink(props: ComponentProps<typeof Link>) {
  const navigation = useContext(AppNavigation);
  if (!navigation) return <Link {...props} />;
  return <Link {...props} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank") return;
    const href = typeof props.href === "string" ? props.href : `${props.href.pathname || ""}${props.href.query ? `?${new URLSearchParams(props.href.query as Record<string,string>).toString()}` : ""}`;
    event.preventDefault();
    navigation.navigate(href);
  }} />;
}
