"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
export type MediaLibraryItem = { id: string; ref: string; bytes: number; width: number; height: number; alt: string; status: string; kind:"image"|"video"|"document";mime:string;original_name?:string|null;caption?:string|null;created_at?:string };
export function MediaLibrary({ websiteId, accountId, onChange, protectedIds, onSelect, onInsert, selectedRef, insertLabel }: { websiteId: string; accountId: string; onChange: (items: { ref: string; label: string }[]) => void; protectedIds: string[]; onSelect?: (item: MediaLibraryItem) => void; onInsert?: (item:MediaLibraryItem)=>void; selectedRef?: string | null; insertLabel?: string }) {
  const [library, setLibrary] = useState<{ items: MediaLibraryItem[]; enabled: boolean; usedBytes: number; quotaBytes: number; imageUsedBytes:number;videoUsedBytes:number;videoQuotaBytes:number;documentUsedBytes:number;documentQuotaBytes:number } | null>(null);
  const [notice, setNotice] = useState("Loading your media library…"), [busy, setBusy] = useState(false);
  const endpoint = `/api/websites/${websiteId}/media`;
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store", headers: { "x-lucia-workspace-account": accountId } });
    const body = await response.json();
    if (!response.ok) throw Error(body.error || "Media library unavailable.");
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
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const fileValue=data.get("asset");const alt=String(data.get("assetAlt")||"").trim();const caption=String(data.get("assetCaption")||"").trim()||null;
    if(!(fileValue instanceof File)||fileValue.size<=0){setNotice("Choose a video or PDF first.");return;}
    const uploadFile:File=fileValue;const kind=uploadFile.type.startsWith("video/")?"video":"document";setBusy(true);setNotice("Preparing a secure multipart upload…");
    let created:{mediaId:string;uploadId:string;partSize:number;parts:{partNumber:number;url:string}[]}|null=null;
    try{
      const max=kind==="video"?100_000_000:25_000_000;if(uploadFile.size>max)throw Error(kind==="video"?"Videos are limited to 100 MB.":"PDF documents are limited to 25 MB.");
      const checksumBuffer=await crypto.subtle.digest("SHA-256",await uploadFile.arrayBuffer());const checksum=Array.from(new Uint8Array(checksumBuffer),b=>b.toString(16).padStart(2,"0")).join("");
      const headerBytes=new Uint8Array(await uploadFile.slice(0,32).arrayBuffer());const headerBase64=btoa(Array.from(headerBytes,b=>String.fromCharCode(b)).join(""));
      const response=await fetch(endpoint+"/assets",{method:"POST",headers:{"content-type":"application/json","x-lucia-workspace-account":accountId},body:JSON.stringify({action:"create",kind,mime:uploadFile.type,filename:uploadFile.name,bytes:uploadFile.size,sha256:checksum,headerBase64,alt,caption})});
      const payload=await response.json();if(!response.ok)throw Error(payload.error||"Upload could not be started.");
      const session=payload as {mediaId:string;uploadId:string;partSize:number;parts:{partNumber:number;url:string}[]};created=session;
      const completed:{partNumber:number;etag:string}[]=new Array(session.parts.length);let next=0,done=0;
      async function worker(){while(true){const index=next++;if(index>=session.parts.length)return;const part=session.parts[index];const startOffset=(part.partNumber-1)*session.partSize;const chunk=uploadFile.slice(startOffset,Math.min(uploadFile.size,startOffset+session.partSize));const uploaded=await fetch(part.url,{method:"PUT",body:chunk});if(!uploaded.ok)throw Error("A media upload part failed. The incomplete upload will be cancelled.");const etag=uploaded.headers.get("ETag");if(!etag)throw Error("Storage did not expose the uploaded part checksum. Check bucket CORS before retrying.");completed[index]={partNumber:part.partNumber,etag};done++;setNotice("Uploading "+uploadFile.name+" · "+done+" of "+session.parts.length+" parts…");}}
      await Promise.all(Array.from({length:Math.min(3,session.parts.length)},()=>worker()));
      const finalized=await fetch(endpoint+"/assets",{method:"POST",headers:{"content-type":"application/json","x-lucia-workspace-account":accountId},body:JSON.stringify({action:"complete",mediaId:session.mediaId,uploadId:session.uploadId,parts:completed})});const result=await finalized.json();if(!finalized.ok)throw Error(result.error||"The uploaded media could not be verified.");
      await load();form.reset();setNotice((kind==="video"?"Video":"PDF")+" stored and checked. It is ready in this website media library; use Add to website to insert it into a page or use it in supported article content.");
    }catch(error){if(created){try{await fetch(endpoint+"/assets",{method:"POST",headers:{"content-type":"application/json","x-lucia-workspace-account":accountId},body:JSON.stringify({action:"abort",mediaId:created.mediaId,uploadId:created.uploadId})});}catch{}}
      setNotice(error instanceof Error?error.message:"Media upload failed. Any uncertain reservation remains safely pending for reconciliation.");}
    finally{setBusy(false);}
  }
  async function remove(id: string) {
    setBusy(true);
    try { const response = await fetch(endpoint + "?id=" + id, { method: "DELETE", headers: { "x-lucia-workspace-account": accountId } }); const body = await response.json(); if (!response.ok) throw Error(body.error); await load(); setNotice("Unreferenced media asset removed."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Removal failed."); }
    finally { setBusy(false); }
  }
  return <details className="studio-media-library"><summary>Your media library</summary>
    <p role="status" aria-live="polite">{notice}</p>
    {library && <p>Images: {(library.imageUsedBytes/1_000_000).toFixed(1)} / {(library.quotaBytes/1_000_000).toFixed(0)} MB · Videos: {(library.videoUsedBytes/1_000_000).toFixed(1)} / {(library.videoQuotaBytes/1_000_000).toFixed(0)} MB · PDFs: {(library.documentUsedBytes/1_000_000).toFixed(1)} / {(library.documentQuotaBytes/1_000_000).toFixed(0)} MB. Total reserved: {(library.usedBytes/1_000_000).toFixed(1)} MB. Images are compressed; original image files are not retained.</p>}
    {!library?.enabled && <p>Customer uploads are not enabled yet. You can continue with built-in artwork.</p>}
    <form onSubmit={upload} className="composition-controls">
      <label>Customer image (JPEG, PNG or WebP, up to 4 MB)<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy || !library?.enabled} /></label>
      <label>Describe the image<input name="alt" maxLength={200} required disabled={busy || !library?.enabled} /></label>
      <button disabled={busy || !library?.enabled}>Upload and compress</button>
      <button type="button" disabled={busy} onClick={() => { load().then(() => setNotice("Library refreshed.")).catch((error) => setNotice(error.message)); }}>Refresh library</button>
    </form>
    <form onSubmit={uploadAsset} className="composition-controls"><label>Video (MP4/WebM up to 100 MB) or PDF (up to 25 MB)<input name="asset" type="file" accept="video/mp4,video/webm,application/pdf" required disabled={busy||!library?.enabled}/></label><label>Accessible description<input name="assetAlt" maxLength={200} required disabled={busy||!library?.enabled}/></label><label>Caption (optional)<input name="assetCaption" maxLength={200} disabled={busy||!library?.enabled}/></label><button disabled={busy||!library?.enabled}>Upload video or PDF in parts</button></form>
    <ul>{library?.items.map((item) => <li key={item.id}>
      {item.status === "ready" && item.kind==="image" && <Image unoptimized src={"/_media/" + item.id} alt={item.alt} width={120} height={80} style={{ objectFit: "contain" }} />}
      {item.status === "ready" && item.kind!=="image" && <span>{item.kind==="video"?"Video asset":"PDF document"}</span>}
      {protectedIds.includes(item.id) && <span>In use in this editor. Save a replacement before removing this asset.</span>}
      {onSelect && item.status === "ready" && item.kind==="image" && <button type="button" aria-pressed={selectedRef === item.ref} disabled={busy} onClick={() => onSelect(item)}>{selectedRef === item.ref ? "Selected for article" : "Use as featured image"}</button>}
      {onInsert && item.status === "ready" && (item.kind!=="image" || Boolean(insertLabel)) && <button type="button" disabled={busy} onClick={()=>onInsert(item)}>{insertLabel || "Insert link in article"}</button>}
      {item.status==="ready"&&item.kind!=="image"&&<a href={"/_media/"+item.id} target="_blank" rel="noopener noreferrer">{item.kind==="video"?"Open video":"Download PDF"}</a>}
      <span>{item.original_name||item.alt}{item.caption?" · "+item.caption:""} · {Math.ceil(item.bytes / 1000)} KB · {item.status}</span>
      {(item.status==="ready"||item.status==="deleting"||(item.status==="pending"&&Date.now()-new Date(item.created_at||0).getTime()>24*60*60*1000))?<button type="button" disabled={busy||protectedIds.includes(item.id)} onClick={()=>remove(item.id)}>Remove unused asset</button>:item.status==="pending"?<span>Upload pending. Abandoned uploads are reconciled automatically.</span>:<span>Awaiting storage reconciliation; reserved space remains counted.</span>}
    </li>)}</ul>
  </details>;
}
