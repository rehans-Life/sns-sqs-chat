'use client'

import { ScrollArea } from "@/components/ui/scroll-area";
import socket from "@/utils/socket";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "react-query";

interface Message {
  username: string, message: string
}

export default function Home() {
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [msgs, setMsgs] = useState<Message[]>([]);

  const _ = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async function() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/messages`)
      if (res.ok) {
        const data = await res.json();
        const msgs = data.data.messages;

        setMsgs(msgs);
        return msgs;
      }
      return [];
    }
  });

  const addMessage = useMutation<any, any, Message>({
    mutationFn: async function(variables) {
      console.log(variables);
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/messages`, {
        method: 'POST',
        body: JSON.stringify(variables),
        headers: {
          "Content-Type": "application/json"
        }
      })
    }
  })

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
          addMessage.mutate({
            username: name,
            message: msg,
          });
        }}>Send</button>
      </div>
    </div>
  );
}
