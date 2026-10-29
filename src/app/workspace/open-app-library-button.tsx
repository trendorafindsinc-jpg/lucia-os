"use client";
import type { ReactNode } from "react";

export function OpenAppLibraryButton({className,children}:{className:string;children:ReactNode}) {
  return <button type="button" className={className} onClick={()=>window.dispatchEvent(new Event("lucia:open-app-library"))}>{children}</button>;
}
