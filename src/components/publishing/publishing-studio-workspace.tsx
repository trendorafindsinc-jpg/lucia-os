"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WebsiteStoryStudio } from "@/components/editor/website-story-studio";
import { MediaLibrary, type MediaLibraryItem } from "@/components/editor/media-library";
import { articleRoute, type ArticleKind } from "@/lib/content/article-model";

type Article = {
 id:string;kind:ArticleKind;title:string;slug:string;excerpt:string;category:string;tags:string[];
 status:"draft"|"scheduled"|"published";revision:number;updatedAt:string|Date;
 publishedAt?:string|Date|null;scheduledAt?:string|Date|null;publishedSlug?:string|null;featuredMediaRef?:string|null;
};
type View = "overview"|"all"|"blog"|"news"|"taxonomy"|"media"|"scheduled";
const nav:{id:View;label:string;icon:string}[]=[
 {id:"overview",label:"Overview",icon:"⌂"},{id:"all",label:"All Posts",icon:"▤"},
 {id:"blog",label:"Blog",icon:"✎"},{id:"news",label:"Newsroom",icon:"◉"},
 {id:"taxonomy",label:"Categories & Tags",icon:"⌗"},{id:"media",label:"Media Library",icon:"▧"},
 {id:"scheduled",label:"Scheduled",icon:"◷"}
];
const dateLabel=(value:string|Date|null|undefined)=>value?new Date(value).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"—";
const statusLabel=(status:Article["status"])=>status==="published"?"Published":status==="scheduled"?"Scheduled":"Draft";
export function PublishingStudioWorkspace({accountId}:{accountId:string}) {
 const params=useSearchParams();
 const websiteId=params.get("websiteId")||"";
 const [view,setView]=useState<View>("overview");
 const [articles,setArticles]=useState<Article[]>([]);
 const [siteSlug,setSiteSlug]=useState("");
 const [siteName,setSiteName]=useState("Your website");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [search,setSearch]=useState("");
 const [status,setStatus]=useState("all");
 const [kind,setKind]=useState("all");
 const [editor,setEditor]=useState<{kind:ArticleKind;articleId?:string|null}|null>(null);\n const [editorDirty,setEditorDirty]=useState(false);\n const reportEditorDirty=useCallback((dirty:boolean)=>setEditorDirty(dirty),[]);
 const headers=useMemo(()=>({"x-lucia-workspace-account":accountId}),[accountId]);
 const load=useCallback(async()=>{
  if(!websiteId){setError("Choose a website before opening Publishing Studio.");setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/websites/"+encodeURIComponent(websiteId)+"/articles",{cache:"no-store",headers});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"Your website content could not be loaded.");
   setArticles(payload.articles||[]);setSiteSlug(payload.siteSlug||"");
   setSiteName(payload.siteName||payload.siteSlug||"Your website");
  }catch(e){setError(e instanceof Error?e.message:"Publishing data is unavailable.");}
  finally{setLoading(false);}
 },[websiteId,headers]);
 useEffect(()=>{void load();},[load]);
 const counts=useMemo(()=>({
  all:articles.length,blog:articles.filter(a=>a.kind==="blog").length,
  news:articles.filter(a=>a.kind==="news").length,
  scheduled:articles.filter(a=>a.status==="scheduled").length,
  published:articles.filter(a=>a.status==="published").length,
  drafts:articles.filter(a=>a.status==="draft").length
 }),[articles]);
 const filtered=useMemo(()=>articles.filter(a=>{
  if(view==="blog"&&a.kind!=="blog")return false;
  if(view==="news"&&a.kind!=="news")return false;
  if(view==="scheduled"&&a.status!=="scheduled")return false;
  if(kind!=="all"&&a.kind!==kind)return false;
  if(status!=="all"&&a.status!==status)return false;
  const query=search.trim().toLowerCase();
  return !query||[a.title,a.slug,a.category,...a.tags].join(" ").toLowerCase().includes(query);
 }),[articles,view,kind,status,search]);
 const categories=useMemo(()=>Array.from(new Set(articles.map(a=>a.category.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b)),[articles]);
 const tags=useMemo(()=>Array.from(new Set(articles.flatMap(a=>a.tags||[]).map(t=>t.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b)),[articles]);
 const openEditor=(article:Article)=>{setEditorDirty(false);setEditor({kind:article.kind,articleId:article.id});};
 const create=(articleKind:ArticleKind)=>{setEditorDirty(false);setEditor({kind:articleKind,articleId:null});};
 const title=nav.find(item=>item.id===view)?.label||"Overview";
 if(!websiteId)return <main className="publishing-shell"><h1>Choose a website</h1><p>Open Publishing Studio from one of your websites.</p><Link href="/workspace/websites">Your websites</Link></main>;
 return <main className="publishing-shell">
  <header className="publishing-topbar"><div className="publishing-brand">LUCIA OS <span aria-hidden="true">/</span> PUBLISHING STUDIO</div>
   <nav className="publishing-toplinks" aria-label="Website shortcuts">
    <Link href={{pathname:"/editor",query:{websiteId}}} onClick={event=>{if(editorDirty&&!window.confirm("You have unsaved article changes. Leave the editor and keep only the last saved draft?"))event.preventDefault();}}>Edit Website</Link>
    {siteSlug&&<a href={"https://"+siteSlug+".lucia.name.ng"} target="_blank" rel="noopener noreferrer">View Website ↗</a>}
    <Link href="/workspace/websites">All websites</Link>
   </nav>
  </header>
  <div className="publishing-layout">
   <aside className="publishing-sidebar" aria-label="Publishing Studio navigation">
    <div className="publishing-site-label"><small>SELECTED WEBSITE</small><strong>{siteName}</strong></div>
    {nav.map(item=><button key={item.id} type="button" className="publishing-nav-item" aria-current={view===item.id?"page":undefined} onClick={()=>{if(editorDirty&&!window.confirm("You have unsaved article changes. Leave the editor and keep only the last saved draft?"))return;setEditorDirty(false);setView(item.id);setSearch("");setStatus("all");setKind("all");setEditor(null);}}>
      <span aria-hidden="true">{item.icon}</span>{item.label}
      {item.id==="all"&&<span>{counts.all}</span>}{item.id==="scheduled"&&<span>{counts.scheduled}</span>}
    </button>)}
   </aside>
   <section className="publishing-main">
    {error&&<p className="publishing-notice" role="alert">{error} <button className="publishing-secondary" type="button" onClick={()=>void load()}>Retry</button></p>}
    {notice&&<p className="publishing-notice" role="status">{notice}</p>}
    {editor?<div className="publishing-editor-wrap">
      <WebsiteStoryStudio key={editor.kind+":"+(editor.articleId||"new")} websiteId={websiteId} accountId={accountId} initialKind={editor.kind} initialArticleId={editor.articleId} startNew={editor.articleId===null} closeLabel="Back to Publishing Studio" onDirtyChange={reportEditorDirty} onClose={()=>{setEditor(null);setEditorDirty(false);void load();}} />
    </div>:<>
     <header className="publishing-heading"><div><p className="publishing-eyebrow">YOUR WEBSITE / PUBLISHING</p><h1>{title}</h1><p>{view==="overview"?"A clear view of everything published, drafted and scheduled on this website.":view==="taxonomy"?"Review the categories and tags already used across your articles.":view==="media"?"Upload and reuse assets from this website’s secure media library.":view==="scheduled"?"Stories waiting for their scheduled publication time.":"Manage and edit your website’s "+(view==="blog"?"Blog":view==="news"?"Newsroom":"posts")+"."}</p></div>
      <div className="publishing-row-actions">{view!=="news"&&<button className="publishing-primary" type="button" onClick={()=>create("blog")}>+ New Post</button>}{view!=="blog"&&<button className="publishing-primary" type="button" onClick={()=>create("news")}>+ New News Story</button>}</div>
     </header>
     {loading?<p className="publishing-panel" role="status">Loading this website’s publishing data…</p>:<>
      {view==="overview"&&<>
       <div className="publishing-stats">
        <div className="publishing-stat"><small>All content</small><strong>{counts.all}</strong></div>
        <div className="publishing-stat"><small>Published</small><strong>{counts.published}</strong></div>
        <div className="publishing-stat"><small>Drafts</small><strong>{counts.drafts}</strong></div>
        <div className="publishing-stat"><small>Scheduled</small><strong>{counts.scheduled}</strong></div>
       </div>
       <section className="publishing-panel"><h2>Recent activity</h2>{articles.length?<ArticleList articles={[...articles].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()).slice(0,6)} siteSlug={siteSlug} onEdit={openEditor}/>:<EmptyState onBlog={()=>create("blog")} onNews={()=>create("news")}/>}</section>
       <section className="publishing-panel"><h2>Quick access</h2><div className="publishing-row-actions"><button className="publishing-secondary" type="button" onClick={()=>setView("blog")}>Blog · {counts.blog}</button><button className="publishing-secondary" type="button" onClick={()=>setView("news")}>Newsroom · {counts.news}</button><button className="publishing-secondary" type="button" onClick={()=>setView("scheduled")}>Scheduled · {counts.scheduled}</button></div></section>
      </>}
      {["all","blog","news","scheduled"].includes(view)&&<section className="publishing-panel">
       <div className="publishing-list-tools"><input aria-label="Search articles" type="search" placeholder="Search titles, categories and tags…" value={search} onChange={e=>setSearch(e.target.value)}/>
        {view==="all"&&<select aria-label="Filter by content type" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All types</option><option value="blog">Blog</option><option value="news">News</option></select>}
        {view!=="scheduled"&&<select aria-label="Filter by publication status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select>}
       </div>
       {filtered.length?<ArticleList articles={filtered} siteSlug={siteSlug} onEdit={openEditor}/>:<div className="publishing-empty"><strong>{search?"No matching articles":"Nothing here yet"}</strong><p>{search?"Try a different search or clear your filters.":"Create your first story to start building this website’s publishing library."}</p><div className="publishing-row-actions"><button className="publishing-secondary" type="button" onClick={()=>create("blog")}>New Post</button><button className="publishing-secondary" type="button" onClick={()=>create("news")}>New News Story</button></div></div>}
      </section>}
      {view==="taxonomy"&&<section className="publishing-panel"><div className="publishing-taxonomy"><div><h2>Categories</h2><p className="publishing-muted">Categories are stored on each article. Edit a story to assign or change its category.</p>{categories.length?categories.map(category=><div className="publishing-taxonomy-item" key={category}><strong>{category}</strong><span>{articles.filter(a=>a.category===category).length} articles</span></div>):<p className="publishing-muted">No categories have been used yet.</p>}</div><div><h2>Tags</h2><p className="publishing-muted">Tags are stored on each article. Edit a story to assign or change its tags.</p>{tags.length?tags.map(tag=><div className="publishing-taxonomy-item" key={tag}><strong>{tag}</strong><span>{articles.filter(a=>a.tags.includes(tag)).length} articles</span></div>):<p className="publishing-muted">No tags have been used yet.</p>}</div></div></section>}
      {view==="media"&&<section className="publishing-panel publishing-media-panel"><h2>Website media</h2><p className="publishing-muted">Files are stored through the existing secure media service for this website. Upload acceptance depends on the configured external storage provider.</p><MediaLibrary websiteId={websiteId} accountId={accountId} onChange={()=>{}} protectedIds={articles.map(a=>a.featuredMediaRef).filter((ref):ref is string=>Boolean(ref)).map(ref=>ref.slice(6))} onSelect={(item:MediaLibraryItem)=>setNotice("Selected "+(item.original_name||item.alt)+". Open an article to use it as featured or inline media.")} defaultOpen/></section>}
     </>}
    </>}
   </section>
  </div>
 </main>;
}
function EmptyState({onBlog,onNews}:{onBlog:()=>void;onNews:()=>void}){return <div className="publishing-empty"><strong>Your publishing workspace is ready.</strong><p>Create a Blog post or News story. Drafts remain private until you publish.</p><div className="publishing-row-actions"><button className="publishing-secondary" type="button" onClick={onBlog}>Create first Blog post</button><button className="publishing-secondary" type="button" onClick={onNews}>Create first News story</button></div></div>}
function ArticleList({articles,siteSlug,onEdit}:{articles:Article[];siteSlug:string;onEdit:(article:Article)=>void}){return <div className="publishing-article-list">{articles.map(article=><article className="publishing-article-row" key={article.id}><div><h3>{article.title||"Untitled story"}</h3><p>{article.kind==="blog"?"Blog":"News"} · {article.category||"Uncategorised"} · Updated {dateLabel(article.updatedAt)} · Revision {article.revision}{article.status==="scheduled"?" · Scheduled for "+dateLabel(article.scheduledAt):""}</p></div><div className="publishing-row-actions"><span className="publishing-status" data-status={article.status}>{statusLabel(article.status)}</span><button type="button" onClick={()=>onEdit(article)}>Edit</button>{article.status==="published"&&article.publishedSlug&&siteSlug&&<a href={"https://"+siteSlug+".lucia.name.ng"+articleRoute(article.kind,article.publishedSlug)} target="_blank" rel="noopener noreferrer">View ↗</a>}</div></article>)}</div>}
