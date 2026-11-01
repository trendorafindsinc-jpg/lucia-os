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
 const [availableMediaCount,setAvailableMediaCount]=useState<number|null>(null);
 const onMediaChange=useCallback((items:{ref:string;label:string}[])=>setAvailableMediaCount(items.length),[]);
 const headers = useMemo<Record<string,string>>(()=>{ const value:Record<string,string>={}; if(accountId)value["x-lucia-workspace-account"]=accountId; return value; },[accountId]);
 const load = useCallback(async () => {
  setLoading(true);setMessage("");
  try {
   const response=await fetch("/api/websites/"+encodeURIComponent(websiteId)+"/articles",{cache:"no-store",headers});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error || "Could not load content.");
   setArticles(payload.articles);
   setSiteSlug(payload.siteSlug || "");
   setSelected(current=>current && payload.articles.some((a:Story)=>a.id===current)?current:(payload.articles[0]?.id||null));
   setDirty(false);
  } catch(error){setMessage(error instanceof Error?error.message:"Could not load articles.");}
  finally{setLoading(false);}
 },[websiteId,headers]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
  if(dirty)return;
  setDraft(articles.find(a=>a.id===selected)??null);
 },[articles,selected,dirty]);
 function change(field:"title"|"slug"|"excerpt"|"body"|"category",value:string) {
  setDraft(previous=>previous?{...previous,[field]:value}:previous);
  setDirty(true);setMessage("");
 }
 function choose(id:string) {
  if(dirty && !window.confirm("Discard unsaved changes to this article?"))return;
  setDirty(false);setSelected(id);setPreview(false);
 }
 async function create(event:React.FormEvent){
  event.preventDefault();
  if(!newTitle.trim()||busy)return;
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/websites/"+websiteId+"/articles",{
    method:"POST",headers:{"Content-Type":"application/json",...headers},
    body:JSON.stringify({kind,title:newTitle.trim()}),
   });
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"Could not create article.");
   setArticles(prev=>[payload.article,...prev]);setSelected(payload.article.id);
   setDraft(payload.article);setDirty(false);setNewTitle("");
   setMessage("Draft created and saved to your website.");
  }catch(error){setMessage(error instanceof Error?error.message:"Creation failed.");}
  finally{setBusy(false);}
 }
 async function save(action:"save"|"publish"|"unpublish") {
  if(!draft||busy)return;
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/websites/"+websiteId+"/articles/"+draft.id,{
    method:"PATCH",headers:{"Content-Type":"application/json",...headers},
    body:JSON.stringify({title:draft.title,slug:draft.slug,excerpt:draft.excerpt,
     body:draft.body,category:draft.category,featuredMediaRef:draft.featuredMediaRef,revision:draft.revision,action}),
   });
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error || "Article could not be saved.");
   const saved=payload.article as Story;
   setArticles(prev=>prev.map(a=>a.id===saved.id?saved:a));
   setDraft(saved);setDirty(false);
   setMessage(action==="publish"?"Published to your live website.":action==="unpublish"?"Article unpublished.":"Draft saved. Live content was not changed.");
  }catch(error){setMessage(error instanceof Error?error.message:"Save failed; previous live version was preserved.");}
  finally{setBusy(false);}
 }
 const items=articles.filter(a=>a.kind===kind);
 return <section className="story-studio" aria-label="Website Blog and News Studio">
  <div className="story-studio-top">
   <div><p className="story-studio-kicker">YOUR WEBSITE / CONTENT</p><h2>Stories & updates</h2><p>Write for the website you already own. Drafts stay private until Publish.</p></div>
   <button type="button" onClick={()=>{if(!dirty || window.confirm("Discard unsaved changes?"))onClose();}} aria-label="Return to website">✕ Return to website</button>
  </div>
  <div className="story-studio-switch" role="group" aria-label="Content type">
   <button type="button" aria-pressed={kind==="blog"} onClick={()=>{setKind("blog");setSelected(null);setDirty(false);setDraft(null);}}>Blog</button>
   <button type="button" aria-pressed={kind==="news"} onClick={()=>{setKind("news");setSelected(null);setDirty(false);setDraft(null);}}>News</button>
  </div>
  <div className="story-studio-columns">
   <aside className="story-studio-list">
    <form onSubmit={create}><label>New {kind} title<input required maxLength={150} value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder={kind==="blog"?"Our first story":"A company announcement"}/></label><button disabled={busy||loading} type="submit">+ Create draft</button></form>
    {loading?<p role="status">Loading your website articles…</p>:
     items.length ? items.map(article=><button className={article.id===selected?"story-selected":""} key={article.id} type="button" onClick={()=>choose(article.id)}>
      <strong>{article.title}</strong><small>{article.status==="published"?"Published":"Private draft"} · revision {article.revision}</small>
     </button>):<p>No {kind} articles yet.</p>}
   </aside>
   <div className="story-studio-editor">
    {draft?<>
     <div className="story-studio-info"><span>{draft.status==="published"?"Live version exists":"Private draft"}</span><span>{dirty?"Unsaved edits":"All edits saved"}</span></div>
     {preview?<article className="story-studio-preview"><small>Draft preview · Not a public URL</small><h3>{draft.title}</h3><p>{draft.excerpt}</p>{draft.featuredMediaRef&&<Image unoptimized className="story-studio-featured-preview" src={"/_media/"+draft.featuredMediaRef.slice(6)} alt={draft.featuredMediaAlt||""} width={1200} height={750}/>}<div dangerouslySetInnerHTML={{__html:renderArticleMarkdown(draft.body)}}/></article>:
      <div className="story-studio-fields">
       <label>Headline<input value={draft.title} maxLength={150} onChange={e=>change("title",e.target.value)}/></label>
       <label>Article URL<input value={draft.slug} maxLength={120} onChange={e=>change("slug",newArticleSlug(e.target.value))}/></label>
       <label>Category (optional)<input value={draft.category} maxLength={80} onChange={e=>change("category",e.target.value)}/></label>
       <label>Summary<textarea value={draft.excerpt} maxLength={320} rows={3} onChange={e=>change("excerpt",e.target.value)}/></label>
       <label>Article content (Markdown)<div className="story-markdown-toolbar" role="toolbar" aria-label="Article formatting">
        <button type="button" onClick={()=>change("body",draft.body+"\n\n## Heading")}>Heading</button>
        <button type="button" onClick={()=>change("body",draft.body+"\n\n**Bold text**")}>Bold</button>
        <button type="button" onClick={()=>change("body",draft.body+"\n\n[Link text](https://example.com)")}>Link</button>
        <button type="button" onClick={()=>change("body",draft.body+"\n\n- List item")}>Bullet list</button>
        <button type="button" onClick={()=>change("body",draft.body+"\n\n> Quote")}>Quote</button>
       </div><textarea value={draft.body} maxLength={50000} rows={14} onChange={e=>change("body",e.target.value)} placeholder="Write your story. Use the formatting tools or Markdown for headings, links, lists and emphasis."/><small>Formatting is rendered safely. Raw scripts and unsafe links are removed; images must use this website’s approved media library.</small></label>
       <div className="story-studio-featured"><div><strong>Featured image</strong><p>Choose an image already stored for this website, or upload one to the same secure image library.</p>{availableMediaCount!==null&&<small>{availableMediaCount} ready image{availableMediaCount===1?"":"s"} in this website library.</small>}</div>{draft.featuredMediaRef&&<Image unoptimized className="story-studio-featured-preview" src={"/_media/"+draft.featuredMediaRef.slice(6)} alt={draft.featuredMediaAlt||""} width={900} height={560}/>}{draft.featuredMediaRef&&<button type="button" disabled={busy} onClick={()=>{setDraft(previous=>previous?{...previous,featuredMediaRef:null,featuredMediaAlt:null}:previous);setDirty(true);}}>Remove featured image</button>}<MediaLibrary websiteId={websiteId} accountId={accountId??""} onChange={onMediaChange} onSelect={(item:MediaLibraryItem)=>{setDraft(previous=>previous?{...previous,featuredMediaRef:item.ref,featuredMediaAlt:item.alt}:previous);setDirty(true);setMessage("");}} selectedRef={draft.featuredMediaRef} protectedIds={Array.from(new Set([...articles.flatMap(article=>[article.featuredMediaRef,article.publishedSnapshot?.featuredMediaRef]),draft.featuredMediaRef,draft.publishedSnapshot?.featuredMediaRef].filter((ref):ref is string=>Boolean(ref)).map(ref=>ref.slice(6))) )}/></div>
      </div>}
     <div className="story-studio-actions">
      <button type="button" onClick={()=>setPreview(p=>!p)}>{preview?"Edit article":"Preview draft"}</button>
      <button type="button" disabled={busy||loading||!dirty} onClick={()=>void save("save")}>Save draft</button>
      <button className="story-studio-live" type="button" disabled={busy||loading} onClick={()=>void save("publish")}>{busy?"Working…":"Publish"}</button>
      {draft.status==="published"&&<button type="button" disabled={busy} onClick={()=>void save("unpublish")}>Unpublish</button>}
     </div>
     {draft.status==="published"&&draft.publishedSlug&&siteSlug&&
       <p><a target="_blank" rel="noopener noreferrer" href={"https://"+siteSlug+".lucia.name.ng"+articleRoute(draft.kind,draft.publishedSlug)}>View live article ↗</a></p>}
    </>:<p>Choose an article or create your first draft.</p>}
   </div>
  </div>
  {message&&<p className="story-studio-notice" role="status">{message}</p>}
 </section>;
}
