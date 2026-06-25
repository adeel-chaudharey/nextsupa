"use client";

// ============================================
// IMPORTS
// ============================================
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ============================================
// TYPES / INTERFACES
// ============================================
interface Todo {
  id: number;
  title: string;
  created_at?: string; // Optional, depending on your schema
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function Home() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  // Stores all todos fetched from database
  const [todos, setTodos] = useState<Todo[]>([]);
  
  // Stores current input field value (new todo title)
  const [title, setTitle] = useState("");
  
  // Tracks loading state for better UX (disables buttons, shows spinner)
  const [loading, setLoading] = useState(false);
  
  // Stores any error message to display to user
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // DATA FETCHING (READ)
  // ==========================================
  
  /**
   * Fetches all todos from Supabase database
   * Called on component mount and after mutations (add/edit/delete)
   */
  async function getTodos() {
    // Show loading state
    setLoading(true);
    setError(null);

    try {
      // Query Supabase: select all from 'todos' table, ordered by ID
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("id", { ascending: true }); // Explicitly set order

      // Handle database error
      if (error) {
        console.error("Error fetching todos:", error);
        setError("Failed to load todos. Please refresh the page.");
        return;
      }

      // Update state with fetched data (or empty array if null)
      setTodos(data || []);
    } catch (err) {
      // Catch any unexpected errors
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred.");
    } finally {
      // Always hide loading state when done
      setLoading(false);
    }
  }

  // ==========================================
  // LIFECYCLE: FETCH ON MOUNT
  // ==========================================
  
  /**
   * useEffect runs when component mounts
   * Empty dependency array [] means it runs only once
   * We use an IIFE (Immediately Invoked Function Expression) for async
   */
  useEffect(() => {
    const fetchData = async () => {
      await getTodos();
    };
    fetchData();
  }, []); // Empty array = run once on mount

  // ==========================================
  // CREATE: ADD NEW TODO
  // ==========================================
  
  /**
   * Adds a new todo to the database
   * Validates input, inserts, then refreshes list
   */
  async function addTodo() {
    // Guard: prevent empty todos (trim removes whitespace)
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Please enter a todo title.");
      return;
    }

    // Show loading and clear previous errors
    setLoading(true);
    setError(null);

    try {
      // Insert new todo into Supabase
      const { error } = await supabase
        .from("todos")
        .insert([{ title: trimmedTitle }]);

      // Handle insert error
      if (error) {
        console.error("Error adding todo:", error);
        setError("Failed to add todo. Please try again.");
        return;
      }

      // Success: clear input and refresh list
      setTitle(""); // Clear input field
      await getTodos(); // Fetch updated list
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // UPDATE: EDIT TODO
  // ==========================================
  
  /**
   * Updates an existing todo's title
   * Uses prompt() for simple editing (could be replaced with modal)
   */
  async function updateTodo(id: number) {
    // Find the todo being edited to show current title
    const currentTodo = todos.find(todo => todo.id === id);
    if (!currentTodo) return;

    // Prompt user for new title (shows current title as default)
    const newTitle = prompt(
      "Enter new title:", 
      currentTodo.title
    );

    // User cancelled or entered empty/whitespace-only title
    if (newTitle === null) return; // User clicked cancel
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setError("Title cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // OPTIMISTIC UPDATE: Update UI immediately for better UX
      setTodos(prevTodos =>
        prevTodos.map(todo =>
          todo.id === id ? { ...todo, title: trimmedTitle } : todo
        )
      );

      // Update in Supabase
      const { error } = await supabase
        .from("todos")
        .update({ title: trimmedTitle })
        .eq("id", id);

      // If error, rollback by refetching
      if (error) {
        console.error("Error updating todo:", error);
        setError("Failed to update todo. Refreshing...");
        await getTodos(); // Rollback to correct data
        return;
      }

      // Success: no need to refetch because we used optimistic update
      // But we can refetch to ensure consistency with server
      await getTodos();
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred.");
      // Rollback: refetch to ensure data consistency
      await getTodos();
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // DELETE: REMOVE TODO
  // ==========================================
  
  /**
   * Deletes a todo from the database
   * Uses optimistic update for better UX
   */
  async function deleteTodo(id: number) {
    // Confirm deletion (optional but user-friendly)
    if (!confirm("Are you sure you want to delete this todo?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // OPTIMISTIC UPDATE: Remove from UI immediately
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));

      // Delete from Supabase
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", id);

      // If error, rollback by refetching
      if (error) {
        console.error("Error deleting todo:", error);
        setError("Failed to delete todo. Refreshing...");
        await getTodos(); // Rollback to correct data
        return;
      }

      // Success: no need to refetch because of optimistic update
      // But we'll refetch to ensure consistency
      await getTodos();
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred.");
      // Rollback: refetch to ensure data consistency
      await getTodos();
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // HELPER: HANDLE ENTER KEY PRESS
  // ==========================================
  
  /**
   * Allows adding todo by pressing Enter key
   */
  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !loading) {
      addTodo();
    }
  }

  // ==========================================
  // RENDER UI
  // ==========================================
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* ===== HEADER ===== */}
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          📝 My Todo List
        </h1>

        {/* ===== ERROR MESSAGE ===== */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-700 underline text-sm mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ===== INPUT SECTION ===== */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a new todo..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={addTodo}
              disabled={loading || !title.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {todos.length} todo{todos.length !== 1 ? "s" : ""} total
          </p>
        </div>

        {/* ===== TODOS LIST ===== */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && todos.length === 0 ? (
            // Show loading spinner when initially fetching
            <div className="p-8 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
              <p>Loading todos...</p>
            </div>
          ) : todos.length === 0 ? (
            // Show empty state
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-2">🎉</p>
              <p>No todos yet! Add one above.</p>
            </div>
          ) : (
            // Render todo list
            <ul className="divide-y divide-gray-200">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Todo content */}
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm text-gray-400 font-mono">
                      #{todo.id}
                    </span>
                    <span className="text-gray-800 font-medium">
                      {todo.title}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateTodo(todo.id)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            {loading && !error && "⏳ Updating..."}
            {!loading && !error && "✓ All synced"}
          </p>
        </div>
      </div>
    </div>
  );
}