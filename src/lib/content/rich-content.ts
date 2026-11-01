import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
const localMediaPath=/^\/_media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const embedHosts=new Set(["www.youtube-nocookie.com","www.youtube.com","player.vimeo.com","open.spotify.com","w.soundcloud.com","embed.podcasts.apple.com","www.tiktok.com","www.instagram.com"]);
function safeEmbedSource(value:string|undefined):string|null{
 if(!value)return null;
 try{
  const u=new URL(value);if(u.protocol!=="https:"||!embedHosts.has(u.hostname))return null;
  if(u.hostname.includes("youtube"))return /^\/embed\/[A-Za-z0-9_-]{6,20}$/.test(u.pathname)&&!u.search?u.toString():null;
  if(u.hostname==="player.vimeo.com")return /^\/video\/[0-9]+$/.test(u.pathname)&&!u.search?u.toString():null;
  if(u.hostname==="open.spotify.com")return /^\/embed\/(track|album|playlist|episode|show)\/[A-Za-z0-9]+$/.test(u.pathname)&&!u.search?u.toString():null;
  if(u.hostname==="w.soundcloud.com"){if(u.pathname!=="/player/")return null;const target=u.searchParams.get("url");if(!target)return null;const s=new URL(target);return s.protocol==="https:"&&["soundcloud.com","api.soundcloud.com"].includes(s.hostname)&&/^\/[A-Za-z0-9_/@.-]+$/.test(s.pathname)?u.toString():null;}
  if(u.hostname==="embed.podcasts.apple.com")return /^\/[a-z]{2}\/podcast\/[a-z0-9-]+\/id[0-9]+$/i.test(u.pathname)?u.toString():null;
  if(u.hostname==="www.tiktok.com")return /^\/embed\/v2\/[0-9]+$/.test(u.pathname)&&!u.search?u.toString():null;
  if(u.hostname==="www.instagram.com")return /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/embed\/$/.test(u.pathname)&&!u.search?u.toString():null;
  return null;
 }catch{return null;}
}
function frame(src:string,title:string){return `<figure class="article-embed"><iframe src="${src.replace(/&/g,"&amp;").replace(/"/g,"&quot;")}" title="${title}" loading="lazy"></iframe></figure>`;}
export function createArticleEmbedHtml(input:string):string|null{
 try{
  const u=new URL(input.trim());if(u.protocol!=="https:")return null;let src:string|null=null,title="Embedded media";
  if(["youtube.com","www.youtube.com","m.youtube.com"].includes(u.hostname)){const id=u.pathname.match(/^\/(?:shorts|live)\/([A-Za-z0-9_-]{6,20})\/?$/)?.[1]??(u.pathname==="/watch"?u.searchParams.get("v"):null);if(id&&/^[A-Za-z0-9_-]{6,20}$/.test(id)){src=`https://www.youtube-nocookie.com/embed/${id}`;title="YouTube video";}}
  else if(u.hostname==="youtu.be"){const id=u.pathname.slice(1);if(/^[A-Za-z0-9_-]{6,20}$/.test(id)){src=`https://www.youtube-nocookie.com/embed/${id}`;title="YouTube video";}}
  else if(["vimeo.com","www.vimeo.com"].includes(u.hostname)){const id=u.pathname.match(/^\/(?:video\/)?([0-9]+)\/?$/)?.[1];if(id){src=`https://player.vimeo.com/video/${id}`;title="Vimeo video";}}
  else if(u.hostname==="open.spotify.com"){const m=u.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)\/?$/);if(m){src=`https://open.spotify.com/embed/${m[1]}/${m[2]}`;title="Spotify "+m[1];}}
  else if(["soundcloud.com","www.soundcloud.com"].includes(u.hostname)){if(/^\/[A-Za-z0-9_/@.-]+$/.test(u.pathname)){src="https://w.soundcloud.com/player/?url="+encodeURIComponent(u.toString());title="SoundCloud audio";}}
  else if(["podcasts.apple.com","itunes.apple.com"].includes(u.hostname)){const m=u.pathname.match(/^\/([a-z]{2})\/podcast\/([a-z0-9-]+)\/(id[0-9]+)$/i);if(m){src=`https://embed.podcasts.apple.com/${m[1]}/podcast/${m[2]}/${m[3]}`;title="Apple Podcasts";}}
  else if(u.hostname==="www.tiktok.com"){const id=u.pathname.match(/^\/@[A-Za-z0-9._-]+\/video\/([0-9]+)\/?$/)?.[1];if(id){src=`https://www.tiktok.com/embed/v2/${id}`;title="TikTok video";}}
  else if(u.hostname==="www.instagram.com"){const m=u.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);if(m){src=`https://www.instagram.com/${m[1]}/${m[2]}/embed/`;title="Instagram post";}}
  return src&&safeEmbedSource(src)?frame(src,title):null;
 }catch{return null;}
}
const sanitizerOptions={
 allowedTags:["p","h1","h2","h3","h4","h5","blockquote","ul","ol","li","strong","b","em","i","del","s","a","img","hr","br","code","pre","table","thead","tbody","tr","th","td","iframe","figure","figcaption","div","span","small","sup","sub","mark","dl","dt","dd","section","details","summary"],
 allowedAttributes:{a:["href","title","target","rel"],img:["src","alt","title","loading","decoding","width","height"],iframe:["src","title","allow","allowfullscreen","loading","referrerpolicy"],th:["colspan","rowspan"],td:["colspan","rowspan"],"*":["aria-label","class"]},
 allowedSchemes:["https","http","mailto","tel"],allowProtocolRelative:false,allowedIframeHostnames:[...embedHosts],
 transformTags:{
  a:(_t:string,a:Record<string,string>)=>({tagName:"a",attribs:{...a,target:"_blank",rel:"noopener noreferrer nofollow"}}),
  img:(_t:string,a:Record<string,string>)=>({tagName:"img",attribs:{...a,loading:"lazy",decoding:"async"}}),
  iframe:(_t:string,a:Record<string,string>)=>{const src=safeEmbedSource(a.src);return src?{tagName:"iframe",attribs:{src,title:(a.title||"Embedded media").slice(0,120),loading:"lazy",referrerpolicy:"strict-origin-when-cross-origin",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",allowfullscreen:""}}:{tagName:"span",attribs:{}};}
 },
 exclusiveFilter:(f:{tag:string;attribs:Record<string,string>})=>f.tag==="img"&&!localMediaPath.test(f.attribs.src||"")
};
export function renderArticleHtml(source:string):string{return sanitizeHtml(source,sanitizerOptions);}
export function renderArticleMarkdown(source:string):string{
 const linked=source.replace(/\]\(media:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi,"](/_media/$1)");
 const html=marked.parse(linked,{async:false,gfm:true,breaks:false,pedantic:false});return typeof html==="string"?renderArticleHtml(html):"";
}
