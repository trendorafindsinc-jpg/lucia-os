"use client";
import Link from "next/link";
import React, { type ReactNode } from "react";

export function OpenAppLibraryButton({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/workspace/apps"
      aria-label="Open App Library"
      className={className}
    >
      {children}
    </Link>
  );
}
