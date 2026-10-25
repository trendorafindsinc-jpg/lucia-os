"use client";

import { useEffect, useMemo, useState } from "react";
import { addMediaAsset, addPost, contentLibrarySchema, makeEmptyLibrary, type BlogPost, type MediaAsset } from "@/lib/content/content-library";

type Tab = "posts" | "media";

export function ContentLibraryWorkspace() {
  const [library, setLibrary] = useState(makeEmptyLibrary);
  const [websiteId, setWebsiteId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [mediaSource, setMediaSource] = useState("");
  const [mediaKind, setMediaKind] = useState<MediaAsset["kind"]>("image");
  const [mediaAlt, setMediaAlt] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const selectedPost = library.posts.find((post) => post.id === selectedPostId) ?? library.posts[0] ?? null;
  const validation = useMemo(() => contentLibrarySchema.safeParse(library), [library]);

  useEffect(() => {
    const requestedWebsiteId = new URLSearchParams(window.location.search).get("websiteId");
    if (!requestedWebsiteId) return;
    setWebsiteId(requestedWebsiteId);
    setIsLoading(true);
    fetch(`/api/websites/${encodeURIComponent(requestedWebsiteId)}/content-library`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Couldn't load this website's content library.");
        const checked = contentLibrarySchema.safeParse(payload.library);
        if (!checked.success) throw new Error("Saved content failed validation. Saving is disabled to protect it.");
        setLibrary(checked.data);
        setSelectedPostId(checked.data.posts[0]?.id ?? null);
        setIsDirty(false);
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        setLoadFailed(true);
        setNotice(error instanceof Error ? `${error.message} Saving is disabled until the library loads safely.` : "Couldn't load the saved library. Saving is disabled to protect existing data.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function saveLibrary() {
    if (!websiteId || isLoading || loadFailed || !validation.success) return;
    setIsSaving(true);
    setNotice("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/content-library`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(validation.data),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Couldn't save content.");
      setIsDirty(false);
      setNotice("Blog and media references saved to this website's workspace. Nothing was published or uploaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't save content. The last saved library remains unchanged.");
    } finally { setIsSaving(false); }
  }

  function updatePost(update: Partial<BlogPost>) {
    if (!selectedPost) return;
    setLibrary((current) => ({ ...current, posts: current.posts.map((post) => post.id === selectedPost.id ? { ...post, ...update, updatedAt: new Date().toISOString() } : post }));
    setIsDirty(true);
    setNotice("");
  }
  function createPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = addPost(library, newTitle);
    if (next === library) { setNotice("Enter a title to create a draft."); return; }
    setLibrary(next);
    setIsDirty(true);
    setSelectedPostId(next.posts[next.posts.length - 1].id);
    setNewTitle("");
    setNotice("Draft added. Save the library to persist it; it is not published.");
  }
  function registerMedia(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mediaName.trim() || !mediaSource.trim()) { setNotice("Add a media name and an existing URL or storage key."); return; }
    const asset: MediaAsset = { id: `asset-${Date.now().toString(36)}`, name: mediaName.trim().slice(0, 120), kind: mediaKind, source: mediaSource.trim().slice(0, 2048), altText: mediaAlt.slice(0, 300), caption: mediaCaption.slice(0, 500), createdAt: new Date().toISOString() };
    const next = addMediaAsset(library, asset);
    if (next === library) { setNotice("Media library limit reached."); return; }
    setLibrary(next); setIsDirty(true); setMediaName(""); setMediaSource(""); setMediaAlt(""); setMediaCaption("");
    setNotice("Media reference added. Save the library to persist it; no file was uploaded.");
  }
  function removeMedia(assetId: string) {
    if (library.posts.some((post) => post.featuredImageId === assetId)) { setNotice("This media is used as a featured image. Remove that reference first."); return; }
    setLibrary((current) => ({ ...current, assets: current.assets.filter((asset) => asset.id !== assetId) }));
    setIsDirty(true);
    setNotice("Media record removed from this local draft.");
  }

  return <section className="content-workspace" aria-label="Blog and media workspace">
    <div className="content-validation"><span>{isLoading ? "Loading saved library…" : loadFailed ? "Saved library unavailable · saving disabled" : websiteId ? (isDirty ? "Unsaved changes" : "Saved workspace library") : "Local draft · not saved"}</span>{websiteId && <button type="button" className="content-primary-button" onClick={saveLibrary} disabled={isLoading || loadFailed || isSaving || !isDirty || !validation.success}>{isSaving ? "Saving…" : "Save library"}</button>}</div>
    <div className="content-tabs" role="tablist" aria-label="Content type">
      <button type="button" role="tab" aria-selected={tab === "posts"} className={tab === "posts" ? "is-active" : ""} onClick={() => { setTab("posts"); setNotice(""); }}>Blog posts <span>{library.posts.length}</span></button>
      <button type="button" role="tab" aria-selected={tab === "media"} className={tab === "media" ? "is-active" : ""} onClick={() => { setTab("media"); setNotice(""); }}>Media library <span>{library.assets.length}</span></button>
    </div>
    {tab === "posts" ? <div className="content-post-layout">
      <aside className="content-list-panel"><div className="content-panel-heading"><div><span className="content-kicker">YOUR STORIES</span><h2>Blog posts</h2></div><span>{library.posts.length}/500</span></div>
        <form className="content-create-form" onSubmit={createPost}><label htmlFor="content-new-post">Start a new post</label><input id="content-new-post" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={120} placeholder="e.g. What we're building" /><button type="submit" disabled={library.posts.length >= 500}>+ Create draft</button></form>
        {library.posts.length ? <div className="content-post-list">{library.posts.map((post) => <button type="button" key={post.id} className={selectedPost?.id === post.id ? "content-post-choice is-active" : "content-post-choice"} onClick={() => { setSelectedPostId(post.id); setNotice(""); }}><strong>{post.title}</strong><span>/{post.slug}</span><small>{post.status}</small></button>)}</div> : <div className="content-empty"><span aria-hidden="true">✎</span><strong>No stories yet</strong><p>Create your first draft to start shaping a blog post.</p></div>}
      </aside>
      <div className="content-editor-panel">{selectedPost ? <>
        <div className="content-panel-heading"><div><span className="content-kicker">POST EDITOR</span><h2>{selectedPost.title || "Untitled post"}</h2></div><span className="content-status">{selectedPost.status}</span></div>
        <div className="content-fields">
          <label>Post title<input value={selectedPost.title} maxLength={120} onChange={(event) => updatePost({ title: event.target.value })} /></label>
          <label>URL slug<input value={selectedPost.slug} maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={(event) => updatePost({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-") })} /><small>Lowercase letters, numbers and hyphens.</small></label>
          <label>Short summary<textarea value={selectedPost.excerpt} maxLength={320} rows={3} onChange={(event) => updatePost({ excerpt: event.target.value })} placeholder="A short introduction for readers and previews." /><small>{selectedPost.excerpt.length}/320 characters</small></label>
          <label>Article content<textarea value={selectedPost.body} maxLength={50000} rows={9} onChange={(event) => updatePost({ body: event.target.value })} placeholder="Write the article here. Rich-text editing comes later." /><small>{selectedPost.body.length}/50,000 characters · Plain text</small></label>
          <label>Workflow status<select value={selectedPost.status} onChange={(event) => updatePost({ status: event.target.value as BlogPost["status"] })}>{["draft", "review", "scheduled", "published", "archived"].map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select><small>Changing this label does not publish or schedule the post.</small></label>
          <label>Featured image<select value={selectedPost.featuredImageId ?? ""} onChange={(event) => updatePost({ featuredImageId: event.target.value || null })}><option value="">No featured image</option>{library.assets.filter((asset) => asset.kind === "image").map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
          <label>Tags, comma separated<input value={selectedPost.tags.join(", ")} onChange={(event) => updatePost({ tags: [...new Set(event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 12) })} placeholder="news, organisation, updates" /><small>Up to 12 tags.</small></label>
        </div>
        <div className="content-editor-foot"><span>Last edited {new Date(selectedPost.updatedAt).toLocaleString()}</span><button type="button" className="content-danger-button" onClick={() => { setLibrary((current) => ({ ...current, posts: current.posts.filter((post) => post.id !== selectedPost.id) })); setSelectedPostId(null); setNotice("Post removed from this draft. Save to persist the change."); }}>Delete draft</button></div>
      </> : <div className="content-empty content-empty-large"><span aria-hidden="true">✎</span><strong>Choose a story or create a draft</strong><p>Choose a saved website to persist posts and media references.</p></div>}</div>
    </div> : <div className="content-media-layout">
      <section className="content-editor-panel"><div className="content-panel-heading"><div><span className="content-kicker">MEDIA RECORDS</span><h2>Register an existing asset</h2><p>Add an existing URL or future storage key. This form does not upload files.</p></div></div>
        <form className="content-fields" onSubmit={registerMedia}>
          <label>Asset name<input value={mediaName} onChange={(event) => setMediaName(event.target.value)} maxLength={120} placeholder="e.g. Homepage banner" required /></label>
          <label>Asset type<select value={mediaKind} onChange={(event) => setMediaKind(event.target.value as MediaAsset["kind"])}><option value="image">Image</option><option value="video">Video</option><option value="document">Document</option></select></label>
          <label>Existing URL or storage key<input value={mediaSource} onChange={(event) => setMediaSource(event.target.value)} maxLength={2048} placeholder="https://… or a future storage key" required /></label>
          <label>Alternative text<input value={mediaAlt} onChange={(event) => setMediaAlt(event.target.value)} maxLength={300} placeholder="Describe the image for screen readers" /></label>
          <label>Caption or note<textarea value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} maxLength={500} rows={3} placeholder="Optional context or credit" /></label>
          <button type="submit" className="content-primary-button">+ Register media details</button>
        </form>
      </section>
      <section className="content-editor-panel"><div className="content-panel-heading"><div><span className="content-kicker">YOUR LIBRARY</span><h2>Media assets</h2></div><span>{library.assets.length}/1000</span></div>
        {library.assets.length ? <div className="content-assets">{library.assets.map((asset) => <article className="content-asset" key={asset.id}><div className="content-asset-icon" aria-hidden="true">{asset.kind === "image" ? "▧" : asset.kind === "video" ? "▷" : "▤"}</div><div className="content-asset-copy"><strong>{asset.name}</strong><span>{asset.kind} · {asset.source}</span>{asset.altText && <small>Alt: {asset.altText}</small>}{asset.caption && <small>{asset.caption}</small>}</div><button type="button" className="content-danger-button" onClick={() => removeMedia(asset.id)}>Remove</button></article>)}</div> : <div className="content-empty"><span aria-hidden="true">▧</span><strong>Your library is empty</strong><p>Register existing media details. Real uploads and storage permissions come later.</p></div>}
      </section>
    </div>}
    {notice && <p className="content-notice" role="status">{notice}</p>}
    <div className="content-validation"><span>{validation.success ? "Content checks passed" : "Check post slugs and featured media references"}</span><span>{websiteId ? (isDirty ? "Unsaved · Not published" : "Workspace data · Not published") : "Local only · Not saved or published"}</span></div>
  </section>;
}
