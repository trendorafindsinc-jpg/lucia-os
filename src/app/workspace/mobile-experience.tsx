"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { WORKSPACE_APPS } from "@/lib/workspace/app-registry";
import styles from "./mobile-experience.module.css";
type View = "home" | "apps" | "activity" | "more" | "appearance";
const backgrounds: Record<string,string> = {
  aurora:"radial-gradient(ellipse at 75% 25%,#779cdb,transparent 60%),linear-gradient(165deg,#07172d,#344b86 47%,#b8b3e7)",
  ocean:"radial-gradient(ellipse at 70% 15%,#58b3c2,transparent 60%),linear-gradient(160deg,#041a32,#155b83 55%,#93d5e3)",
  midnight:"radial-gradient(ellipse at 20% 10%,#34416d,transparent 60%),linear-gradient(160deg,#040b19,#101e3d 60%,#384c78)",
  sunset:"radial-gradient(ellipse at 70% 20%,#f4a7ae,transparent 55%),linear-gradient(160deg,#29174a,#85528f 55%,#efb7a4)"
};
export default function MobileExperience({userId}:{userId:string}) {
  const [view,setView] = useState<View>("home");
  const [wallpaper,setWallpaper] = useState("aurora");
  const [custom,setCustom] = useState("");
  const [notice,setNotice] = useState("");
  const key = "lucia-os:appearance:"+userId;
  useEffect(()=>{try{const raw=localStorage.getItem(key);if(raw){const saved=JSON.parse(raw) as {wallpaper?:string;custom?:string};if(saved.wallpaper && (backgrounds[saved.wallpaper]||saved.wallpaper==="custom"))setWallpaper(saved.wallpaper);if(saved.custom?.startsWith("data:image/"))setCustom(saved.custom)}}catch{}},[key]);
  useEffect(()=>{
    document.documentElement.dataset.luciaMobileView=view;
    return ()=>{delete document.documentElement.dataset.luciaMobileView};
  },[view]);
  useEffect(()=>{
    const bg=wallpaper==="custom"&&custom?`linear-gradient(rgba(3,12,30,.3),rgba(3,12,30,.3)),url("${custom}") center / cover fixed`:backgrounds[wallpaper]||backgrounds.aurora;
    document.documentElement.style.setProperty("--lucia-mobile-wallpaper",bg);
    return ()=>{document.documentElement.style.removeProperty("--lucia-mobile-wallpaper");};
  },[wallpaper,custom]);
  function choose(value:string,image=custom){setWallpaper(value);setCustom(image);try{localStorage.setItem(key,JSON.stringify({wallpaper:value,custom:image}))}catch{setNotice("Unable to save on this device. Free up browser storage.")}}
  async function upload(file?:File){if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>900_000){setNotice("Choose a JPG, PNG or WebP under 900 KB.");return}const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string"){choose("custom",reader.result);setNotice("Wallpaper saved on this device.")}};reader.readAsDataURL(file)}
  return <div className={styles.mobileExperience}>
    {view!=="home"&&<section className={styles.screen} aria-label={view==="apps"?"App Library":view==="appearance"?"Wallpaper settings":view}>
      <div className={styles.screenHeader}><button onClick={()=>setView(view==="appearance"?"more":"home")} aria-label="Back">‹</button><h1>{view==="apps"?"Your Apps":view==="activity"?"Activity":view==="appearance"?"Wallpaper":"More"}</h1></div>
      {view==="apps"&&<div className={styles.library}>{WORKSPACE_APPS.map(app=><div key={app.key} className={styles.app}>{app.status==="available"&&app.href?<Link href={app.href} className={styles.appIcon} aria-label={app.label}><span aria-hidden="true">{app.icon==="loomify-ai"?"✦":app.icon==="website"?"▣":app.icon==="layouts"?"▤":app.icon==="overview"?"▦":"◎"}</span></Link>:<span className={styles.disabledIcon} aria-label={app.reason||"Unavailable"} title={app.reason}>◌</span>}<span>{app.label}</span></div>)}</div>}
      {view==="activity"&&<p className={styles.note}>Your activity feed is not available yet. No activity is being displayed.</p>}
      {view==="more"&&<div className={styles.more}><button onClick={()=>setView("appearance")}>Appearance & Wallpaper <span>›</span></button><Link href="/workspace/domains">Domains <span>›</span></Link><Link href="/workspace/team">Team & access <span>›</span></Link><Link href="/support">Help & support <span>›</span></Link></div>}
      {view==="appearance"&&<><p className={styles.note}>Choose your workspace background. Preferences are saved on this device for your account.</p><div className={styles.gallery}>{Object.entries(backgrounds).map(([name,bg])=><button key={name} onClick={()=>choose(name)} aria-pressed={wallpaper===name}><span style={{background:bg}}/><strong>{name[0].toUpperCase()+name.slice(1)}</strong>{wallpaper===name?" ✓":""}</button>)}</div><label className={styles.upload}>Upload your wallpaper<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0])}/></label><button className={styles.reset} onClick={()=>choose("aurora","")}>Restore default</button>{notice&&<p role="status" className={styles.note}>{notice}</p>}</>}
    </section>}
    <nav className={styles.dock} aria-label="Mobile workspace navigation">
      <button aria-current={view==="home"?"page":undefined} onClick={()=>setView("home")}><span>⌂</span><small>Home</small></button>
      <button aria-current={view==="apps"?"page":undefined} onClick={()=>setView("apps")}><span>▦</span><small>Apps</small></button>
      <span className={styles.orbSlot} aria-hidden="true"><span>✦</span><small>Orb</small></span>
      <button aria-current={view==="activity"?"page":undefined} onClick={()=>setView("activity")}><span>◷</span><small>Activity</small></button>
      <button aria-current={view==="more"||view==="appearance"?"page":undefined} onClick={()=>setView("more")}><span>☷</span><small>More</small></button>
    </nav>
  </div>;
}
