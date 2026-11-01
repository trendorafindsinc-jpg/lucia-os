import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const localMediaPath = /^\/_media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const embedHosts = new Set(["www.youtube-nocookie.com", "www.youtube.com", "player.vimeo.com"]);

function safeEmbedSource(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !embedHosts.has(url.hostname)) return null;
    if (url.hostname.includes("youtube")) return /^\/embed\/[A-Za-z0-9_-]{6,20}$/.test(url.pathname) ? url.toString() : null;
    return /^\/video\/[0-9]+$/.test(url.pathname) ? url.toString() : null;
  } catch { return null; }
}

const sanitizerOptions = {
  allowedTags: ["p","h1","h2","h3","h4","h5","blockquote","ul","ol","li","strong","b","em","i","del","s","a","img","hr","br","code","pre","table","thead","tbody","tr","th","td","iframe","figure","figcaption","div","span","small","sup","sub","mark","dl","dt","dd","section","details","summary"],
  allowedAttributes: {
    a:["href","title","target","rel"], img:["src","alt","title","loading","decoding","width","height"],
    iframe:["src","title","allow","allowfullscreen","loading","referrerpolicy"],
    th:["colspan","rowspan"], td:["colspan","rowspan"], "*":["aria-label"],
  },
  allowedSchemes:["https","http","mailto","tel"],
  allowProtocolRelative:false,
  allowedIframeHostnames:[...embedHosts],
  transformTags:{
    a:(_tagName:string,attribs:Record<string,string>)=>({tagName:"a",attribs:{...attribs,target:"_blank",rel:"noopener noreferrer nofollow"}}),
    img:(_tagName:string,attribs:Record<string,string>)=>({tagName:"img",attribs:{...attribs,loading:"lazy",decoding:"async"}}),
    iframe:(_tagName:string,attribs:Record<string,string>)=>{
      const src=safeEmbedSource(attribs.src);
      return src
        ? {tagName:"iframe",attribs:{src,title:(attribs.title||"Embedded media").slice(0,120),loading:"lazy",referrerpolicy:"strict-origin-when-cross-origin",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",allowfullscreen:""}}
        : {tagName:"span",attribs:{} as Record<string,string>};
    },
  },
  exclusiveFilter:(frame:{tag:string;attribs:Record<string,string>})=>frame.tag==="img"&&!localMediaPath.test(frame.attribs.src||""),
};

/** Sanitize HTML source with a semantic allow-list and approved HTTPS video embeds. */
export function renderArticleHtml(source:string):string {
  return sanitizeHtml(source,sanitizerOptions);
}

/** Markdown is converted to HTML, then passed through the same public-output sanitizer. */
export function renderArticleMarkdown(source:string):string {
  const mediaLinked=source.replace(/\]\(media:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi,"](/_media/$1)");
  const rendered=marked.parse(mediaLinked,{async:false,gfm:true,breaks:false,pedantic:false});
  return typeof rendered==="string"?renderArticleHtml(rendered):"";
}
