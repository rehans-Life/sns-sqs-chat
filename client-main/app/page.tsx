'use client'

import { ScrollArea } from "@/components/ui/scroll-area";
import socket from "@/utils/socket";
import { useEffect, useState } from "react";

interface Message {
  username: string, message: string
}

export default function Home() {
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [msgs, setMsgs] = useState<Message[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/messages`)
      if (res.ok) {
        const data = await res.json();
        setMsgs(data.data.messages as Message[]);
      }
    })();
  }, []);

  useEffect(() => {
    function onNewMessage(newMessage: Message) {
      setMsgs([...msgs, newMessage]);
    }

    socket.on("new-message", onNewMessage)
 
    return () => {
      socket.removeListener("new-message", onNewMessage);
    }
  }, [msgs]);
  

  return (
    <div className="flex items-center flex-col gap-y-3">
      <ScrollArea className="h-[200px] w-[350px] border-black rounded-md border p-4">
        {msgs.map((msg, i) => {
          return <div key={i} className="flex items-center gap-x-1">
            <div className="text-black font-medium">{msg.username}:</div>
            <div className="text-black">{msg.message}</div>
          </div>
        })}
      </ScrollArea>
      <div className="flex items-center gap-2">
        <input 
          type="text" 
          value={name} 
          placeholder="set name"
          onChange={(e) => setName(e.target.value)} 
          className="border border-black"
        />
        <button onClick={() => {
          socket.emit("set-username", name);
        }} >Set</button>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="text" 
          value={msg} 
          placeholder="enter message"
          onChange={(e) => setMsg(e.target.value)}           
          className="border border-black"
        />
        <button onClick={() => {
          if (!name) return;
          socket.emit("new-message", msg);
        }}>Send</button>
      </div>
    </div>
  );
}
