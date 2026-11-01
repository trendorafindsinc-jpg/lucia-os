"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ArticleKind } from "@/lib/content/article-model";
import Image from "next/image";
import { MediaLibrary, type MediaLibraryItem } from "./media-library";
import { articleRoute, newArticleSlug } from "@/lib/content/article-model";
import { renderArticleMarkdown } from "@/lib/content/rich-content";
import "./website-story-studio.css";
type Story = {
 id:string;kind:ArticleKind;title:string;slug:string;excerpt:string;body:string;category:string;
 featuredMediaRef:string|null;featuredMediaAlt:string|null;publishedSnapshot:{featuredMediaRef?:string|null}|null;
 revision:number;status:"draft"|"published";publishedSlug:string|null;publishedAt:string|null;
};
export function WebsiteStoryStudio({websiteId,accountId,initialKind,onClose}:{
 websiteId:string;accountId?:string|null;initialKind:ArticleKind;onClose:()=>void;
}) {
 const [kind,setKind]=useState<ArticleKind>(initialKind);
 const [articles,setArticles]=useState<Story[]>([]);
 const [siteSlug,setSiteSlug]=useState("");
 const [selected,setSelected]=useState<string|null>(null);
 const [draft,setDraft]=useState<Story|null>(null);
 const [newTitle,setNewTitle]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [preview,setPreview]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [availableMediaCount,setAvailableMediaCount]=useSta¶»§q«^