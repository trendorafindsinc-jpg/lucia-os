import "server-only";
import Link from "next/link";
import Image from "next/image";
import { cache } from "react";
import type { Metadata, Route } from "next";
import { and, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { normalizeHostname } from "@/lib/domains/hostname";
import { isPlatformHostname } from "@/lib/publishing/platform-hosts";
import { articleDraftSchema, articleRoute } from "@/lib/content/article-model";
import { websiteDomains, websitePosts, websites, organizations } from "@/lib/db/schema";
import styles from "./public-articles.module.css";
import { renderArticleMarkdown } from "./rich-content";

export function isArticlePath(path: string) {
 return /^(?:\/)?(?:blog|news)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?\/?$/.test(path);
}
const readPublished = cache(async (path: string, websiteSlug?: string) => {
 const segments=path.replace(/^\/|\/$/g,"").split("/");
 const kind=segments[0],slug=segments[1] ?? null;
 if ((kind!=="blog" && kind!=="news") || segments.length>2) notFound();
 const host=(await headers()).get("host");
 if(!host)notFound();
 let hostname:string;
 try{hostname=normalizeHostname(new URL("http://"+host).hostname);}catch{notFound();}
 const db=getDb();
 let [site]=await db.select({id:websites.id,organizationId:websites.organizationId,name:websites.name})
  .from(websiteDomains).innerJoin(websites,and(eq(websiteDomains.websiteId,websites.id),eq(websiteDomains.organizationId,websites.organizationId)))
  .innerJoin(organizations,eq(organizations.id,websites.organizationId))
  .where(and(eq(websiteDomains.hostname,hostname),eq(websiteDomains.status,"active"),
   eq(websites.status,"published"),eq(organizations.status,"active"))).limit(1);
 if(!site&&websiteSlug&&isPlatformHostname(hostname)){
  const [platformSite]=await db.select({id:websites.id,organizationId:websites.organizationId,name:websites.name})
   .from(websites).innerJoin(organizations,eq(organizations.id,websites.organizationId))
   .where(and(eq(websites.slug,websiteSlug),eq(websites.status,"published"),eq(organizations.status,"active"))).limit(1);
  site=platformSite;
 }
 if(!site)notFound();
 const base=and(eq(websitePosts.websiteId,site.id),eq(websitePosts.organizationId,site.organizationId),
  eq(websitePosts.kind,kind),eq(websitePosts.status,"published"));
 const entries=await db.select({
  id:websitePosts.id,kind:websitePosts.kind,slug:websitePosts.publishedSlug,
  snapshot:websitePosts.publishedSnapshot,publishedAt:websitePosts.publishedAt,
 }).from(websitePosts).where(slug ? and(base,eq(websitePosts.publishedSlug,slug)) : base)
  .orderBy(desc(websitePosts.publishedAt)).limit(slug?1:100);
 const posts=entries.flatMap(entry=>{
  const parsed=articleDraftSchema.safeParse(entry.snapshot);
  if(!parsed.success || parsed.data.kind!==kind || parsed.data.slug!==entry.slug)return [];
  return [{...parsed.data,id:entry.id,publishedAt:entry.publishedAt}];
 });
 if(!slug)posts.sort((a,b)=>Number(b.isFeatured)-Number(a.isFeatured)||new Date(b.publishedAt??0).getTime()-new Date(a.publishedAt??0).getTime());
 if(slug && !posts.length){
  const redirects=await db.execute(sql`select p.published_slug from website_post_slug_redirects r
   join website_posts p on p.id=r.post_id and p.website_id=r.website_id and p.organization_id=r.organization_id
   where r.organization_id=${site.organizationId}::uuid and r.website_id=${site.id}::uuid
   and r.kind=${kind} and r.old_slug=${slug} and p.status='published' and p.published_slug is not null limit 1`);
  const target=(redirects[0] as {published_slug?:string}|undefined)?.published_slug;
  if(target)permanentRedirect(("/"+kind+"/"+target) as Route);
  notFound();
 }
 return {site,hostname,kind:kind as "blog"|"news",posts,slug};
});
export async function publicArticleMetadata(path:string,websiteSlug?:string):Promise<Metadata> {
 const data=await readPublished(path,websiteSlug);
 const article=data.slug ? data.posts[0] : null;
 const title=article ? (article.seoTitle || article.title) : data.kind==="blog" ? "Blog" : "News";
 const description=article?.seoDescription || article?.excerpt || "Latest "+data.kind+" from "+data.site.name;
 const image=article?.featuredMediaRef ? "https://"+data.hostname+"/_media/"+article.featuredMediaRef.slice(6) : undefined;
 return {title:{absolute:title+" | "+data.site.name},description,openGraph:{type:"article",title,description,images:image?[image]:undefined},twitter:{card:image?"summary_large_image":"summary",title,description,images:image?[image]:undefined},robots:{index:true,follow:true}};
}
export async function PublicArticlePage({path,searchParams,websiteSlug}:{path:string;searchParams?:Record<string,string|string[]|undefined>;websiteSlug?:string}) {
 const {site,kind,posts,slug}=await readPublished(path,websiteSlug);
 const categoryValue=typeof searchParams?.category==="string"?searchParams.category:"";
 const tagValue=typeof searchParams?.tag==="string"?searchParams.tag:"";
 const filteredPosts=slug?posts:posts.filter(post=>(!categoryValue||post.category===categoryValue)&&(!tagValue||post.tags.includes(tagValue)));
 const categories=[...new Set(posts.map(post=>post.category).filter((value):value is string=>Boolean(value)))].sort();
 const tags=[...new Set(posts.flatMap(post=>post.tags))].sort();
 const label=kind==="blog"?"Blog":"News";
 const item=slug?posts[0]:null;
 return <main className={styles.shell}>
  <nav className={styles.nav} aria-label="Site navigation">
   <Link href="/">{site.name}</Link><div><Link href={"/blog" as Route}>Blog</Link><Link href={"/news" as Route}>News</Link></div>
  </nav>
  {item ? <article className={styles.article}>
   <p className={styles.eyebrow}>{label}{item.category?" · "+item.category:""}</p>
   {item.tags.length>0&&<p className={styles.eyebrow}>{item.tags.join(" · ")}</p>}
   <h1>{item.title}</h1><p className={styles.excerpt}>{item.excerpt}</p>
   {item.authorName&&<p className={styles.eyebrow}>By {item.authorName}</p>}
   {item.eventAt&&<p className={styles.eyebrow}>Event: <time dateTime={item.eventAt}>{new Date(item.eventAt).toLocaleString("en-GB",{dateStyle:"long",timeStyle:"short"})}</time></p>}
   {item.correctionNote&&<aside className={styles.correction}><strong>Correction / update</strong><p>{item.correctionNote}</p>{item.correctsSlug&&<Link href={"/news/"+item.correctsSlug as Route}>View the earlier report</Link>}</aside>}
   {item.featuredMediaRef && <Image unoptimized className={styles.featuredImage} src={"/_media/"+item.featuredMediaRef.slice(6)} alt={item.featuredMediaAlt||""} width={1600} height={1000}/>}
   {item.publishedAt && <time dateTime={item.publishedAt.toISOString()}>{item.publishedAt.toLocaleDateString("en-GB",{dateStyle:"long"})}</time>}
   <div className={styles.body} dangerouslySetInnerHTML={{ __html: renderArticleMarkdown(item.body) }} />
   <a className={styles.return} href={"/"+kind}>← All {label.toLowerCase()}</a>
  </article> : <section className={styles.index}>
   <p className={styles.eyebrow}>{site.name} / {label}</p><h1>{label}</h1>
   <p className={styles.excerpt}>{kind==="blog"?"Ideas, stories and perspectives.":"Updates and announcements."}</p>
   {(categories.length>0||tags.length>0)&&<nav aria-label={label+" filters"} className={styles.taxonomy}><Link href={"/"+kind as Route}>All</Link>{categories.map(value=><Link key={"category:"+value} href={"/"+kind+"?category="+encodeURIComponent(value) as Route} aria-current={categoryValue===value?"page":undefined}>{value}</Link>)}{tags.map(value=><Link key={"tag:"+value} href={"/"+kind+"?tag="+encodeURIComponent(value) as Route} aria-current={tagValue===value?"page":undefined}>#{value}</Link>)}</nav>}
   {filteredPosts.length? <div className={styles.grid}>{filteredPosts.map(post=><article key={post.id}>
    {post.featuredMediaRef && <Image unoptimized className={styles.cardImage} src={"/_media/"+post.featuredMediaRef.slice(6)} alt={post.featuredMediaAlt||""} width={800} height={500}/>}
    <p className={styles.eyebrow}>{post.isFeatured?"Featured · ":""}{post.category||label}</p>
    {post.authorName&&<p className={styles.eyebrow}>By {post.authorName}</p>}
    {post.eventAt&&<time dateTime={post.eventAt}>Event: {new Date(post.eventAt).toLocaleDateString("en-GB",{dateStyle:"long"})}</time>}
    {post.correctionNote&&<p className={styles.eyebrow}>Updated / corrected</p>}
    <h2><a href={articleRoute(kind,post.slug)}>{post.title}</a></h2><p>{post.excerpt}</p>
    {post.publishedAt&&<time dateTime={post.publishedAt.toISOString()}>{post.publishedAt.toLocaleDateString("en-GB")}</time>}
   </article>)}</div>:<p>{posts.length?"No "+label.toLowerCase()+" articles match this filter.":"No "+label.toLowerCase()+" articles have been published yet."}</p>}
  </section>}
 </main>;
}

export async function readPublishedContentContract(websiteSlug?:string){
 const [blog,news]=await Promise.all([readPublished("/blog",websiteSlug),readPublished("/news",websiteSlug)]);
 const serialize=(article:typeof blog.posts[number],kind:"blog"|"news")=>({
  kind,title:article.title,slug:article.slug,route:articleRoute(kind,article.slug),excerpt:article.excerpt,body:article.body,
  category:article.category,tags:article.tags,author:article.authorName,eventAt:article.eventAt,isFeatured:article.isFeatured,
  correctionNote:article.correctionNote,correctsSlug:article.correctsSlug,seoTitle:article.seoTitle,seoDescription:article.seoDescription,
  publishedAt:article.publishedAt?.toISOString()??null,
  featuredMedia:article.featuredMediaRef?{ref:article.featuredMediaRef,url:"https://"+blog.hostname+"/_media/"+article.featuredMediaRef.slice(6),alt:article.featuredMediaAlt}:null
 });
 return {contract:"lucia.published-content.v1",site:{name:blog.site.name,hostname:blog.hostname},content:{blog:blog.posts.map(post=>serialize(post,"blog")),news:news.posts.map(post=>serialize(post,"news"))}};
}
export async function PublicContentHighlights({websiteSlug}:{websiteSlug?:string}={}){
 let data:Awaited<ReturnType<typeof readPublishedContentContract>>;
 try{data=await readPublishedContentContract(websiteSlug);}catch(error){if(error&&typeof error==="object"&&"digest" in error) return null;throw error;}
 const posts=[...data.content.blog,...data.content.news].sort((a,b)=>Number(b.isFeatured)-Number(a.isFeatured)||new Date(b.publishedAt??0).getTime()-new Date(a.publishedAt??0).getTime()).slice(0,3);
 if(!posts.length)return null;
 return <section className={styles.highlights} aria-labelledby="published-content-heading">
  <header><p className={styles.eyebrow}>{data.site.name} / Journal</p><h2 id="published-content-heading">Stories & updates</h2><p>Ideas, news and recent highlights.</p></header>
  <div className={styles.highlightGrid}>{posts.map(post=><article key={post.kind+":"+post.slug}>
   {post.featuredMedia&&<Image unoptimized className={styles.cardImage} src={"/_media/"+post.featuredMedia.ref.slice(6)} alt={post.featuredMedia.alt||""} width={800} height={500}/>}
   <p className={styles.eyebrow}>{post.isFeatured?"Featured · ":""}{post.kind==="blog"?"Blog":"News"}{post.category?" · "+post.category:""}</p>
   <h3><Link href={post.route as Route}>{post.title}</Link></h3><p>{post.excerpt}</p>
  </article>)}</div>
  <nav aria-label="All published content"><Link href={"/blog" as Route}>All Blog posts</Link><Link href={"/news" as Route}>All News</Link></nav>
 </section>;
}
