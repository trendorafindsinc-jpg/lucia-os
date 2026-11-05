"use client";

import type { ArticleContentBlock } from "@/lib/content/article-model";

function makeId() {
 return globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 24) ?? "block" + Math.random().toString(36).slice(2, 14);
}
function plainText(blocks: ArticleContentBlock[]) {
 return blocks.map(block => {
  switch (block.type) {
   case "paragraph": case "heading": case "quote": case "legacy": return block.type === "legacy" ? block.source : block.text;
   case "list": return block.items.join(" ");
   case "table": return [...block.headers, ...block.rows.flat()].join(" ");
   case "link": return block.text + " " + block.url;
   case "divider": return "";
  }
 }).join("\n\n");
}
function convert(block: ArticleContentBlock, type: string): ArticleContentBlock {
 const id = block.id;
 const text = block.type === "legacy" ? block.source : "text" in block ? block.text : "";
 switch (type) {
  case "paragraph": return { id, type: "paragraph", text };
  case "heading": return { id, type: "heading", level: 2, text };
  case "list": return { id, type: "list", ordered: false, items: text ? [text] : [""] };
  case "quote": return { id, type: "quote", text, citation: null };
  case "table": return { id, type: "table", headers: ["Column 1", "Column 2"], rows: [["", ""]] };
  case "divider": return { id, type: "divider" };
  case "link": return { id, type: "link", text, url: "https://example.com" };
  default: return { id, type: "paragraph", text };
 }
}
export function ArticleBlockEditor({ blocks, onChange }: { blocks: ArticleContentBlock[]; onChange: (blocks: ArticleContentBlock[]) => void }) {
 function update(index: number, next: ArticleContentBlock) { onChange(blocks.map((block, i) => i === index ? next : block)); }
 function add(type: string) {
  const empty: ArticleContentBlock = type === "heading" ? { id: makeId(), type: "heading", level: 2, text: "" }
   : type === "list" ? { id: makeId(), type: "list", ordered: false, items: [""] }
   : type === "quote" ? { id: makeId(), type: "quote", text: "", citation: null }
   : type === "table" ? { id: makeId(), type: "table", headers: ["Column 1", "Column 2"], rows: [["", ""]] }
   : type === "divider" ? { id: makeId(), type: "divider" }
   : type === "link" ? { id: makeId(), type: "link", text: "", url: "https://example.com" }
   : { id: makeId(), type: "paragraph", text: "" };
  onChange([...blocks, empty]);
 }
 function move(index: number, delta: number) {
  const target = index + delta; if (target < 0 || target >= blocks.length) return;
  const next = [...blocks]; [next[index], next[target]] = [next[target], next[index]]; onChange(next);
 }
 return <section className="article-block-editor" aria-label="Article blocks">
  <div className="article-block-editor-heading"><strong>Article content</strong><span>{blocks.length} block{blocks.length === 1 ? "" : "s"}</span></div>
  {!blocks.length && <p className="article-block-empty">Start writing by adding a paragraph, heading or another content block.</p>}
  {blocks.map((block, index) => <article className="article-content-block" key={block.id}>
   <header><label>Block {index + 1}<select aria-label={"Block " + (index + 1) + " type"} value={block.type === "legacy" ? "legacy" : block.type} onChange={event => update(index, convert(block, event.target.value))}>
    <option value="paragraph">Paragraph</option><option value="heading">Heading</option><option value="list">List</option><option value="quote">Quote</option><option value="table">Table</option><option value="divider">Divider</option><option value="link">Link</option><option value="legacy">Existing content</option>
   </select></label><div className="article-block-actions">
    <button type="button" aria-label={"Move block " + (index + 1) + " up"} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
    <button type="button" aria-label={"Move block " + (index + 1) + " down"} disabled={index === blocks.length - 1} onClick={() => move(index, 1)}>↓</button>
    <button type="button" aria-label={"Duplicate block " + (index + 1)} onClick={() => { const copy = { ...block, id: makeId() } as ArticleContentBlock; onChange([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]); }}>Duplicate</button>
    <button type="button" aria-label={"Delete block " + (index + 1)} onClick={() => onChange(blocks.filter((_, i) => i !== index))}>Delete</button>
   </div></header>
   {block.type === "paragraph" && <textarea aria-label={"Paragraph " + (index + 1)} rows={4} value={block.text} onChange={e => update(index, { ...block, text: e.target.value })} placeholder="Write your paragraph…"/>}
   {block.type === "heading" && <div className="article-block-inline"><select aria-label="Heading level" value={block.level} onChange={e => update(index, { ...block, level: Number(e.target.value) as 2|3|4|5|6 })}>{[2,3,4,5,6].map(level => <option key={level} value={level}>Heading {level}</option>)}</select><input aria-label={"Heading " + (index + 1)} value={block.text} onChange={e => update(index, { ...block, text: e.target.value })} placeholder="Section heading"/></div>}
   {block.type === "list" && <div><label><input type="checkbox" checked={block.ordered} onChange={e => update(index, { ...block, ordered: e.target.checked })}/> Numbered list</label>{block.items.map((item, itemIndex) => <div className="article-block-inline" key={itemIndex}><input aria-label={"List item " + (itemIndex + 1)} value={item} onChange={e => update(index, { ...block, items: block.items.map((v, i) => i === itemIndex ? e.target.value : v) })}/><button type="button" onClick={() => update(index, { ...block, items: block.items.filter((_, i) => i !== itemIndex) })}>Remove</button></div>)}<button type="button" onClick={() => update(index, { ...block, items: [...block.items, ""] })}>+ Add list item</button></div>}
   {block.type === "quote" && <div><textarea aria-label="Quotation" rows={3} value={block.text} onChange={e => update(index, { ...block, text: e.target.value })} placeholder="Write a quotation…"/><input aria-label="Quote attribution" value={block.citation ?? ""} onChange={e => update(index, { ...block, citation: e.target.value || null })} placeholder="Attribution (optional)"/></div>}
   {block.type === "table" && <div className="article-block-table"><div>{block.headers.map((cell, i) => <input key={i} aria-label={"Table heading " + (i + 1)} value={cell} onChange={e => update(index, { ...block, headers: block.headers.map((v, j) => j === i ? e.target.value : v), rows: block.rows.map(row => [...row]) })}/>)}</div>{block.rows.map((row, ri) => <div key={ri}>{block.headers.map((_, ci) => <input key={ci} aria-label={"Table row " + (ri + 1) + " column " + (ci + 1)} value={row[ci] ?? ""} onChange={e => update(index, { ...block, rows: block.rows.map((r, j) => j === ri ? block.headers.map((__, k) => k === ci ? e.target.value : r[k] ?? "") : r) })}/>)}</div>)}<button type="button" onClick={() => update(index, { ...block, rows: [...block.rows, block.headers.map(() => "")] })}>+ Add row</button></div>}
   {block.type === "link" && <div className="article-block-inline"><input aria-label="Link text" value={block.text} onChange={e => update(index, { ...block, text: e.target.value })} placeholder="Link text"/><input aria-label="Link URL" type="url" value={block.url} onChange={e => update(index, { ...block, url: e.target.value })} placeholder="https://example.com"/></div>}
   {block.type === "legacy" && <textarea aria-label="Existing article content" rows={8} value={block.source} onChange={e => update(index, { ...block, source: e.target.value })}/>}
   {block.type === "divider" && <hr/>}
  </article>)}
  <div className="article-block-add"><label htmlFor="article-block-kind">Add a block</label><select id="article-block-kind" defaultValue="paragraph" onChange={e => { add(e.target.value); e.currentTarget.value = "paragraph"; }}><option value="paragraph">Paragraph</option><option value="heading">Heading</option><option value="list">Bulleted / numbered list</option><option value="quote">Blockquote</option><option value="table">Table</option><option value="divider">Divider</option><option value="link">Link</option></select><button type="button" onClick={() => add("paragraph")}>+ Paragraph</button></div>
 </section>;
}
export function articleBlocksPlainText(blocks: ArticleContentBlock[]) { return plainText(blocks); }
