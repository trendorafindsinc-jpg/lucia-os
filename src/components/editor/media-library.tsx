"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
export type MediaLibraryItem = { id: string; ref: string; bytes: number; width: number; height: number; alt: string; status: string; kind:"image"|"video"|"document";mime:string;original_name?:string|null;caption?:string|null };
export function MediaLibrary({ websiteId, accountId, onChange, protectedIds, onSelect, onInsert, selectedRef }: { websiteId: string; accountId: string; onChange: (items: { ref: string; label: string }[]) => void; protectedIds: string[]; onSelect?: (item: MediaLibraryItem) => void; onInsert?: (item:MediaLibraryItem)=>void; selectedRef?: string | null }) {
  const [library, setLibrary] = useState<{ items: MediaLibraryItem[]; enabled: boolean; usedBytes: number; quotaBytes: number } | null>(null);
  const [notice, setNotice] = useState("Loading your image library…"), [busy, setBusy] = useState(false);
  const endpoint = `/api/websites/${websiteId}/media`;
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store", headers: { "x-lucia-workspace-account": accountId } });
    const body = await response.json();
    if (!response.ok) throw Error(body.error || "Image library unavailable.");
    setLibrary(body);
    onChange(body.items.filter((item: MediaLibraryItem) => item.status === "ready" && item.kind === "image").map((item: MediaLibraryItem) => ({ ref: item.ref, label: "Your image: " + item.alt })));
    return body;
  }, [endpoint, accountId, onChange]);
  useEffect(() => { let active = true; load().then(() => { if (active) setNotice(""); }).catch((error) => { if (active) setNotice(error.message); }); return () => { active = false; }; }, [load]);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    setBusy(true); setNotice("Compressing and saving your image…");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "x-lucia-workspace-account": accountId }, body: new FormData(form) });
      const body = await response.json(); if (!response.ok) throw Error(body.error);
      await load(); form.reset(); setNotice("Image stored. Choose it from an image selector, then save your website or article.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed. Please try again."); }
    finally { setBusy(false); }
  }
  async function uploadAsset(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const file=data.get("asset") as File|null;const alt=String(data.get("assetAlt")||"").trim();
    if(!file||!file.size){setNotice("Choose a video or PDF first.");return;}
    const kind=file.type.startsWith("video/")?"video":"document";setBusy(true);setNotice("Preparing a secure multipart upload…");let created:{mediaId:string;uploadId:string;partSize:number;parts:{partNumber:number;url:string}[]}|null=null;
    try{
      const max=kind==="video"?100_000_000:25_000_000;if(file.size>max)throw Error(kind==="video"?"Videos are limited to 100 MB.":"PDF documents are limited to 25 MB.");
      const checksumBuffer=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());const checksum=Array.from(new Uint8Array(checksumBuffer),b=>b.toString(16).padStart(2,"0")).join("");
      const headerBytes=new Uint8Array(await file.slice(0,32).arrayBuffer());const headerBase64=btoa(Array.from(headerBytes,b=>String.fromCharCode(b)).join(""));
      const response=await fetch(endpoint+"/assets",{method:"POST",headers:{"content-type":"application/json","x-lucia-workspace-account":accountId},body:JSON.stringify({action:"create",kind,mime:file.type,filename:file.name,bytes:file.size,sha256:checksum,headerBase64,alt})});
      const payload=await response.json();if(!response.ok)throw Error(payload.error||"Upload could not be started.");created=payload;
      const completed:{partNumber:number;etag:string}[]=new Array(created.parts.length);let next=0,done=0;
      async function worker(){while(true){const index=next++;if(index>=created!.parts.length)return;const part=created!.parts[index];const start=(part.partNumber-1)*created!.partSize;const chunk=file.slice(start,Math.min(file.size,start+created!.partSize));const uploaded=await fetch(part.url,{method:"PUT",body:chunk});if(!uploaded.ok)throw Error("A media upload part failed. The incomplete upload will be cancelled.");const etag=uploaded.headers.get("ETag");if(!etag)throw Error("Storage did not expose the uploaded part checksum. Check bucket CORS before retrying.");completed[index]={partNumber:part.partNumber,etag};done++;setNotice("Uploading "+file.name+" · "+done+" of "+created!.parts.length+" parts…");}}
      await Promise.all(Array.from({length:Math.min(3,created.parts.length)},()=>worker()));
      const finalized=await fetch(endpoint+"/assets",{method:"POST",headers:{"content-type":"application/json","x-lucia-workspace-account":accountId},body:JSON.stringify({action:"complete",mediaId:created.mediaId,uploadId:created.uploadId,parts:completed})});const result=await finalized.json();if(!finalized.ok)throw Error(result.error||"The uploaded media could not be verified.");
      await load();form.reset();setNotice((kind==="video"?"Video":"PDF")+" stored and verified. Insert its link into your article or use it from the published media URL.");
    }catch(error){if(created){try{await fetch(endpoint+"/assets",{method:"POST",headers:{"content-type":"application/json","x-lucia-workspace-account":accountId},body:JSON.stringify({action:"abort",mediaId:created.mediaId,uploadId:created.uploadId})});}catch{}}
      setNotice(error instanceof Error?error.message:"Media upload failed. Any uncertain reservation remains safely pending for reconciliation.");}
    finally{setBusy(false);}
  }
  async function remove(id: string) {
    setBusy(true);
    try { const response = await fetch(endpoint + "?id=" + id, { method: "DELETE", headers: { "x-lucia-workspace-account": accountId } }); const body = await response.json(); if (!response.ok) throw Error(body.error); await load(); setNotice("Unreferenced image removed."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Removal failed."); }
    finally { setBusy(false); }
  }
  return <details className="studio-media-library"><summary>Your media library</summary>
    <p role="status" aria-live="polite">{notice}</p>
    {library && <p>{(library.usedBytes / 1_000_000).toFixed(2)} MB used of {(library.quotaBytes / 1_000_000).toFixed(2)} MB. Images are compressed; original files are not retained.</p>}
    {!library?.enabled && <p>Customer uploads are not enabled yet. You can continue with built-in artwork.</p>}
    <form onSubmit={upload} className="composition-controls">
      <label>Customer image (JPEG, PNG or WebP, up to 4 MB)<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy || !library?.enabled} /></label>
      <label>Describe the image<input name="alt" maxLength={200} required disabled={busy || !library?.enabled} /></label>
      <button disabled={busy || !library?.enabled}>Upload and compress</button>
      <button type="button" disabled={busy} onClick={() => { load().then(() => setNotice("Library refreshed.")).catch((error) => setNotice(error.message)); }}>Refresh library</button>
    </form>
    <form onSubmit={uploadAsset} className="composition-controls"><label>Video (MP4/WebM up to 100 MB) or PDF (up to 25 MB)<input name="asset" type="file" accept="video/mp4,video/webm,application/pdf" required disabled={busy||!library?.enabled}/></label><label>Accessible description<input name="assetAlt" maxLength={200} required disabled={busy||!library?.enabled}/></label><button disabled={busy||!library?.enabled}>Upload video or PDF in parts</button></form>
    <ul>{library?.items.map((item) => <li key={item.id}>
      {item.status === "ready" && item.kind==="image" && <Image unoptimized src={"/_media/" + item.id} alt={item.alt} width={120} height={80} style={{ objectFit: "contain" }} />}
      {item.status === "ready" && item.kind!=="image" && <span>{item.kind==="video"?"Video asset":"PDF document"}</span>}
      {protectedIds.includes(item.id) && <span>In use in this editor. Save a replacement before removing this asset.</span>}
      {onSelect && item.status === "ready" && item.kind==="image" && <button type="button" aria-pressed={selectedRef === item.ref} disabled={busy} onClick={() => onSelect(item)}>{selectedRef === item.ref ? "Selected for article" : "Use as featured image"}</button>}
      {onInsert && item.status === "ready" && item.kind!=="image" && <button type="button" disabled={busy} onClick={()=>onInsert(item)}>Insert link in article</button>}
      {item.status==="ready"&&item.kind!=="image"&&<a href={"/_media/"+item.id} target="_blank" rel="noopener noreferrer">{item.kind==="video"?"Open video":"Download PDF"}</a>}
      <span>{item.original_name||item.alt} · {Math.ceil(item.bytes / 1000)} KB · {item.status}</span>
      {item.status === "ready" || item.status === "deleting" || item.status === "pending" ? <button type="button" disabled={busy || protectedIds.includes(item.id)} onClick={() => remove(item.id)}>Remove unused image</button> : <span>Awaiting storage reconciliation; reserved space remains counted.</span>}
    </li>)}</ul>
  </details>;
}
