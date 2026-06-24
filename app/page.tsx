"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {

  const [todos, setTodos] = useState<any[]>([]);

  useEffect(() => {
    getTodos();
  }, []);

  async function getTodos() {
    const { data, error } = await supabase
      .from("todos")
      .select("*");

    console.log(data);
    console.log(error);

    setTodos(data || []);
  }

  return (
    <div>
      <h1>Todos</h1>

      {todos.map((todo) => (
        <p key={todo.id}>
          {todo.id} - {todo.title}
        </p>
      ))}
    </div>
  );
}