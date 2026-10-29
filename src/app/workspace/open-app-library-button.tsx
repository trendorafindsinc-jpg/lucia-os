"use client";
import React, { type ReactNode } from "react";

export function OpenAppLibraryButton({className,children}:{className:string;children:ReactNode}) {
  return <button type="button" aria-label="Open App Library" className={className} onClick={()=>window.dispatchEvent(new Event("lucia:open-app-library"))}>{children}</button>;
}
