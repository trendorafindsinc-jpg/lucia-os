"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WORKSPACE_APPS } from "@/lib/workspace/app-registry";
import { WorkspaceIcon } from "@/components/workspace/workspace-icon";
import { AssistiveOrb } from "@/components/workspace/assistive-orb";
import styles from "./mobile-experience.module.css";
type View = "home" | "apps" | "activity" | "more" | "settings" | "appearance";
const backgrounds: Record<string,string> = {
  aurora:"radial-gradient(ellipse at 75% 25%,#779cdb,transparent 60%),linear-gradient(165deg,#07172d,#344b86 47%,#b8b3e7)",
  ocean:"radial-gradient(ellipse at 70% 15%,#58b3c2,transparent 60%),linear-gradient(160deg,#041a32,#155b83 55%,#93d5e3)",
  midnight:"radial-gradient(ellipse at 20% 10%,#34416d,transparent 60%),linear-gradient(160deg,#040b19,#101e3d 60%,#384c78)",
  sunset:"radial-gradient(ellipse at 70% 20%,#f4a7ae,transparent 55%),linear-gradient(160deg,#29174a,#85528f 55%,#efb7a4)"
};
export default function MobileExperience({userId}:{userId:string}) {
  const screenRef=useRef<HTMLElement>(null);
  const [view,setView] = useState<View>("home");
  const [wallpaper,setWallpaper] = useState("aurora");
  const [custom,setCustom] = useState("");
  const [notice,setNotice] = useState("");
  const [showHomeApps,setShowHomeApps] = useState(false);
  useEffect(()=>{
    if(view==="home")return;
    screenRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setView("home")};
    document.addEventListener("keydown",onKeyDown);
    return ()=>document.removeEventListener("keydown",onKeyDown);
  },[view]);
  const key = "lucia-os:appearance:"+userId;
  useEffect(()=>{try{const raw=localStorage.getItem(key);if(raw){const saved=JSON.parse(raw) as {wallpaper?:string;custom?:string;showHomeApps?:boolean};setShowHomeApps(saved.showHomeApps===true);if(saved.wallpaper && (backgrounds[saved.wallpaper]||saved.wallpaper==="custom"))setWallpaper(saved.wallpaper);if(saved.custom?.startsWith("data:image/"))setCustom(saved.custom)}}catch{}},[key]);
  useEffect(()=>{
    const openApps=()=>setView("apps");
    window.addEventListener("lucia:open-app-library",openApps);
    return ()=>window.removeEventListener("lucia:open-app-library",openApps);
  },[]);
  useEffect(()=>{
    const media=window.matchMedia("(max-width:680px)");
    const background=document.querySelector<HTMLElement>("[data-lucia-launcher-background]");
    let restore=()=>{};
    function sync(){
      restore();
      document.documentElement.dataset.luciaMobileView=view;
      if(view==="home" || !media.matches)return;
      const scrollY=window.scrollY;
      const {position,top,width,overflow}=document.body.style;
      const wasInert=background?.inert ?? false;
      document.body.style.position="fixed";
      document.body.style.top=`-${scrollY}px`;
      document.body.style.width="100%";
      document.body.style.overflow="hidden";
      if(background)background.inert=true;
      restore=()=>{
        Object.assign(document.body.style,{position,top,width,overflow});
        if(background)background.inert=wasInert;
        window.scrollTo(0,scrollY);
        restore=()=>{};
      };
    }
    sync();
    media.addEventListener("change",sync);
    return ()=>{restore();media.removeEventListener("change",sync);delete document.documentElement.dataset.luciaMobileView};
  },[view]);
  useEffect(()=>{
    document.documentElement.dataset.luciaHomeApps=String(showHomeApps);
    return ()=>{delete document.documentElement.dataset.luciaHomeApps};
  },[showHomeApps]);
  useEffect(()=>{
    const bg=wallpaper==="custom"&&custom?`linear-gradient(rgba(3,12,30,.3),rgba(3,12,30,.3)),url("${custom}") center / cover fixed`:backgrounds[wallpaper]||backgrounds.aurora;
    document.documentElement.style.setProperty("--lucia-mobile-wallpaper",bg);
    return ()=>{document.documentElement.style.removeProperty("--lucia-mobile-wallpaper");};
  },[wallpaper,custom]);
  function choose(value:string,image=custom,homeApps=showHomeApps){
    setWallpaper(value);setCustom(image);setShowHomeApps(homeApps);
    try{localStorage.setItem(key,JSON.stringify({wallpaper:value,custom:image,showHomeApps:homeApps}));setNotice("Preferences saved on this device.");return true}
    catch{setNotice("Applied for now, but unable to save on this device. Free up browser storage and try again.");return false}
  }
  async function upload(file?:File){if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>900_000){setNotice("Choose a JPG, PNG or WebP under 900 KB.");return}try{const image=await createImageBitmap(file);image.close()}catch{setNotice("This file could not be opened as an image. Choose another JPG, PNG or WebP.");return}const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string"){choose("custom",reader.result)}};reader.onerror=()=>setNotice("Unable to read this image. Please try another file.");reader.readAsDataURL(file)}
  return <><div className={styles.mobileExperience}>
    {view!=="home"&&<section ref={screenRef} tabIndex={-1} className={styles.screen} aria-label={view==="apps"?"App Library":view==="appearance"?"Wallpaper settings":view}>
      <div className={styles.screenHeader}><button onClick={()=>setView(view==="appearance"?"settings":view==="settings"?"apps":"home")} aria-label="Back">‹</button><h1>{view==="apps"?"Your Apps":view==="activity"?"Activity":view==="appearance"?"Wallpaper":view==="settings"?"Settings":"More"}</h1></div>
      {view==="apps"&&<div className={styles.library}>{WORKSPACE_APPS.map(app=><div key={app.id} className={styles.app}>{app.status==="available"&&app.launch.kind==="local"&&app.launch.action==="open-settings"?<button className={styles.appIcon} aria-label={app.label} onClick={()=>setView("settings")}><WorkspaceIcon icon={app.icon} /></button>:app.status==="available"&&app.href?<Link href={app.href} className={styles.appIcon} aria-label={app.label}><WorkspaceIcon icon={app.icon} /></Link>:<span className={styles.disabledIcon} aria-label={app.reason||"Unavailable"} title={app.reason}><WorkspaceIcon icon={app.icon} /></span>}<span>{app.label}</span></div>)}</div>}
      {view==="activity"&&<p className={styles.note}>Your activity feed is not available yet. No activity is being displayed.</p>}
      {view==="more"&&<div className={styles.more}><button onClick={()=>setView("settings")}>Settings <span>›</span></button><Link href="/workspace/domains">Domains <span>›</span></Link><Link href="/workspace/team">Team & access <span>›</span></Link><Link href="/support">Help & support <span>›</span></Link></div>}
      {view==="settings"&&<div className={styles.more}><button onClick={()=>setView("appearance")}>Display · Wallpaper <span>›</span></button><label className={styles.preference}><input type="checkbox" checked={showHomeApps} onChange={event=>choose(wallpaper,custom,event.target.checked)}/> Show apps on Home</label><p className={styles.note}>New apps appear in the App Library by default. This setting also shows available apps on Home.</p>{notice&&<p role="status" className={styles.note}>{notice}</p>}</div>}
      {view==="appearance"&&<><p className={styles.note}>Choose your workspace background. Preferences are saved on this device for your account.</p><div className={styles.gallery}>{Object.entries(backgrounds).map(([name,bg])=><button key={name} onClick={()=>choose(name)} aria-pressed={wallpaper===name}><span style={{background:bg}}/><strong>{name[0].toUpperCase()+name.slice(1)}</strong>{wallpaper===name?" ✓":""}</button>)}</div><label className={styles.upload}>Upload your wallpaper<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0])}/></label><button className={styles.reset} onClick={()=>choose("aurora","")}>Restore default</button>{notice&&<p role="status" className={styles.note}>{notice}</p>}</>}
    </section>}
    <nav className={`${styles.dock} lucia-mobile-workspace-dock`} aria-label="Mobile workspace navigation">
      <button aria-current={view==="home"?"page":undefined} onClick={()=>setView("home")}><WorkspaceIcon icon="home" /><small>Home</small></button>
      <button aria-current={view==="apps"?"page":undefined} onClick={()=>setView("apps")}><WorkspaceIcon icon="overview" /><small>Apps</small></button>
      <span className={styles.orbSlot} aria-hidden="true" />
      <button aria-current={view==="activity"?"page":undefined} onClick={()=>setView("activity")}><WorkspaceIcon icon="activity" /><small>Activity</small></button>
      <button aria-current={view==="more"||view==="settings"||view==="appearance"?"page":undefined} onClick={()=>setView("more")}><WorkspaceIcon icon="more" /><small>More</small></button>
    </nav>
  </div><AssistiveOrb homeDock={view==="home"} /></>;
}
