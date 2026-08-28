"use client";
import {useEffect,useRef,useState} from "react";

type Msg={role:"user"|"assistant",content:string};
type Chat={id:string,title:string,messages:Msg[]};

export default function Home(){
 const [chats,setChats]=useState<Chat[]>([]);
 const [active,setActive]=useState("");
 const [input,setInput]=useState("");
 const [loading,setLoading]=useState(false);
 const abortRef=useRef<AbortController|null>(null);

 useEffect(()=>{
   const saved=localStorage.getItem("claude-chats");
   if(saved){const x=JSON.parse(saved);setChats(x);setActive(x[0]?.id||"");}
   else newChat();
 },[]);

 useEffect(()=>{if(chats.length)localStorage.setItem("claude-chats",JSON.stringify(chats));},[chats]);

 function newChat(){
   const c={id:crypto.randomUUID(),title:"New chat",messages:[] as Msg[]};
   setChats(x=>[c,...x]);setActive(c.id);setInput("");
 }
 const chat=chats.find(x=>x.id===active);
 const messages=chat?.messages||[];

 async function send(){
   const text=input.trim(); if(!text||loading)return;
   const next=[...messages,{role:"user" as const,content:text}];
   setInput("");setLoading(true);
   setChats(x=>x.map(c=>c.id===active?{...c,title:c.messages.length?"Chat":text.slice(0,32),messages:[...next,{role:"assistant",content:""}]}:c));
   const controller=new AbortController();abortRef.current=controller;
   try{
    const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next}),signal:controller.signal});
    if(!r.ok) throw new Error((await r.json()).error||"Request failed");
    const reader=r.body!.getReader(),dec=new TextDecoder();let buf="";
    while(true){
      const {done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const parts=buf.split("\n\n");buf=parts.pop()||"";
      for(const p of parts){
       if(p.startsWith("data:")){try{const e=JSON.parse(p.slice(5).trim());if(e.type==="content_block_delta"&&e.delta?.text) {setChats(x=>x.map(c=>c.id===active?{...c,messages:c.messages.map((m,i)=>i===c.messages.length-1?{...m,content:m.content+e.delta.text}:m)}:c));}}catch{}}
      }
    }
   }catch(e:any){if(e.name!=="AbortError")setChats(x=>x.map(c=>c.id===active?{...c,messages:c.messages.map((m,i)=>i===c.messages.length-1?{...m,content:"Error: "+e.message}:m)}:c));}
   finally{setLoading(false);abortRef.current=null}
 }
 function stop(){abortRef.current?.abort();setLoading(false)}
 return <div className="app">
  <aside className="sidebar">
   <div className="brand">✦ Claude Chat</div><button className="new" onClick={newChat}>＋ New chat</button>
   <div className="history">{chats.map(c=><button key={c.id} className={c.id===active?"item active":"item"} onClick={()=>setActive(c.id)}>💬 {c.title}</button>)}</div>
   <div className="sidebottom">Claude-powered AI<br/><small>API key stays on server</small></div>
  </aside>
  <main className="main">
   <header><button className="mobileNew" onClick={newChat}>＋</button><span>Claude Chat</span><button className="clear" onClick={()=>setChats(x=>x.map(c=>c.id===active?{...c,messages:[]}:c))}>Clear</button></header>
   <section className="messages">
    {messages.length===0?<div className="welcome"><div className="logo">✦</div><h1>How can I help you?</h1><p>Ask anything, write code, brainstorm ideas, or learn something new.</p><div className="suggestions">{["Explain a complex topic simply","Build a website for me","Help me write code","Give me creative ideas"].map(s=><button key={s} onClick={()=>setInput(s)}>{s}</button>)}</div></div>:
     messages.map((m,i)=><div className={"row "+m.role} key={i}><div className="avatar">{m.role==="assistant"?"✦":"You"}</div><div className="bubble">{m.content||"Thinking…"}</div></div>)}
   </section>
   <div className="composer"><div className="inputbox"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Message Claude…" rows={1}/><button onClick={loading?stop:send} className="send">{loading?"■":"↑"}</button></div><small>Claude can make mistakes. Check important information.</small></div>
  </main>
 </div>
        }
