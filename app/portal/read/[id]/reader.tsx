"use client";
import { useRef, useState } from "react";
import { acknowledge, deliver } from "./actions";
export default function Reader({listing}:{listing:string}) {
  const attempt=useRef("");
  const pending=useRef(false);
  const [page,setPage]=useState(0);
  const [content,setContent]=useState<Awaited<ReturnType<typeof deliver>>>(null);
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState("");
  async function next() {
    if(pending.current) return;
    pending.current=true;
    setBusy(true);
    setError("");
    try {
      attempt.current ||= crypto.randomUUID();
      if(content && page===content.total) {
        if(!await acknowledge(listing,attempt.current,page,content.release,content.token,content.issued,true)) throw Error();
        setDone(true);
        return;
      }
      const result=await deliver(listing,attempt.current,page+1);
      if(!result) throw Error();
      if(result.image) { const img=new Image(); img.src=result.image; await img.decode(); }
      if(!await acknowledge(listing,attempt.current,page+1,result.release,result.token,result.issued,false)) throw Error();
      setContent(result); setPage(page+1); window.scrollTo(0,0);
    } catch { setError("This page could not be delivered. Try again."); }
    finally { pending.current=false; setBusy(false); }
  }
  if(done) return <p role="status">Chapter completed.</p>;
  return <section>{content && <><p>Page {page} of {content.total}</p>
    {content.body && <article style={{whiteSpace:"pre-wrap"}}>{content.body}</article>}
    {content.image && <img alt={"Chapter page "+page} src={content.image} style={{maxWidth:"100%"}}/>}</>}
    {error && <p role="alert">{error}</p>}
    <button type="button" disabled={busy} onClick={next}>{busy?"Loading…":!content?"Start reading":page===content.total?"Finish chapter":"Next page"}</button></section>;
}
