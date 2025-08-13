import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

type Note = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  file_url?: string | null;
  reminder_at?: string | null;
};

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reminderAt, setReminderAt] = useState<string>(""); // YYYY-MM-DDTHH:mm

  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editReminderAt, setEditReminderAt] = useState<string>(""); // <-- brakujący stan

  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("darkMode") === "true");

  // 1) Pobierz notatki
  useEffect(() => {
    axios.get("http://localhost:8000/notes/").then((res) => setNotes(res.data));
  }, []);

  // 2) Dark mode
  useEffect(() => {
    document.body.className = dark ? "dark" : "";
    localStorage.setItem("darkMode", String(dark));
  }, [dark]);

  // 3) Uprawnienia do powiadomień
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 4) Jednorazowe powiadomienia po nadejściu terminu
  const [notified, setNotified] = useState<Record<number, boolean>>({});
  useEffect(() => {
    const timer = setInterval(() => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const now = new Date();
      notes.forEach((n) => {
        if (!n.reminder_at) return;
        const when = new Date(n.reminder_at);
        if (when <= now && !notified[n.id]) {
          new Notification("⏰ Przypomnienie", { body: n.title || "Notatka" });
          setNotified((prev) => ({ ...prev, [n.id]: true }));
        }
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [notes, notified]);

  // 5) Filtrowanie (tylko raz z useMemo)
  const filteredNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          note.title.toLowerCase().includes(search.toLowerCase()) ||
          note.content.toLowerCase().includes(search.toLowerCase())
      ),
    [notes, search]
  );

  // 6) Dodawanie (z plikiem i przypomnieniem)
  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (file) formData.append("file", file);
    if (reminderAt) formData.append("reminder_at", reminderAt);

    const res = await axios.post("http://localhost:8000/notes/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setNotes((prev) => [...prev, res.data]);
    setTitle("");
    setContent("");
    setFile(null);
    setReminderAt(""); // czyść pole po dodaniu
  };

  // 7) Usuwanie
  const handleDelete = (id: number) => {
    axios
      .delete(`http://localhost:8000/notes/${id}`)
      .then(() => setNotes((prev) => prev.filter((note) => note.id !== id)));
  };

  // 8) Start edycji
  const startEdit = (note: Note) => {
    setEditId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFile(null);
    // dopasuj format do input[type=datetime-local]
    setEditReminderAt(note.reminder_at ? note.reminder_at.slice(0, 16) : "");
  };

  // 9) Zapis edycji (z opcją podmiany pliku i przypomnienia)
  const handleEditSave = async (id: number) => {
    const formData = new FormData();
    formData.append("title", editTitle);
    formData.append("content", editContent);
    if (editFile) formData.append("file", editFile);
    // jeśli puste, przekaż pusty string = wyczyść przypomnienie
    formData.append("reminder_at", editReminderAt);

    const res = await axios.put(`http://localhost:8000/notes/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setNotes((prev) => prev.map((note) => (note.id === id ? res.data : note)));
    setEditId(null);
    setEditTitle("");
    setEditContent("");
    setEditFile(null);
    setEditReminderAt("");
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditTitle("");
    setEditContent("");
    setEditFile(null);
    setEditReminderAt("");
  };

  return (
    <div className="app-container">
      <div style={{ float: "right" }}>
        <button
          style={{
            background: "none",
            color: "var(--button-bg)",
            fontWeight: "bold",
            marginBottom: 0,
          }}
          onClick={() => setDark((d) => !d)}
        >
          {dark ? "🌙 Jasny motyw" : "☀️ Ciemny motyw"}
        </button>
      </div>
      <h1>Notatnik sieciowy</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Szukaj po tytule lub treści..."
        style={{
          width: "100%",
          marginBottom: 16,
          padding: "8px",
          borderRadius: 6,
          border: "1px solid #ddd",
        }}
      />

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tytuł" />
      <br />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Treść" />
      <br />
      <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
      <br />
      <input
        type="datetime-local"
        value={reminderAt}
        onChange={(e) => setReminderAt(e.target.value)}
        placeholder="Termin przypomnienia"
      />
      <br />
      <button onClick={handleAdd}>Dodaj notatkę</button>
      <hr />

      <ul>
        {filteredNotes.length === 0 && <li style={{ color: "#999" }}>Brak notatek do wyświetlenia</li>}
        {filteredNotes.map((note) => {
          const due = note.reminder_at && new Date(note.reminder_at) <= new Date();
          return (
            <li key={note.id} style={due ? { outline: "2px solid #ffa726" } : undefined}>
              {editId === note.id ? (
                <div>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Tytuł" />
                  <br />
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="Treść" />
                  <br />
                  <input type="file" onChange={(e) => setEditFile(e.target.files ? e.target.files[0] : null)} />
                  <br />
                  <input
                    type="datetime-local"
                    value={editReminderAt}
                    onChange={(e) => setEditReminderAt(e.target.value)}
                  />
                  <br />
                  <button
                    onClick={() => handleEditSave(note.id)}
                    style={{
                      background: "#388e3c",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 12px",
                      cursor: "pointer",
                      marginRight: 8,
                    }}
                  >
                    Zapisz
                  </button>
                  <button
                    onClick={handleEditCancel}
                    style={{
                      background: "#9e9e9e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 12px",
                      cursor: "pointer",
                    }}
                  >
                    Anuluj
                  </button>
                </div>
              ) : (
                <div>
                  <b>{note.title}</b> ({new Date(note.created_at).toLocaleString()})
                  <br />
                  {note.content}
                  {note.file_url && (
                    <div>
                      <a href={`http://localhost:8000${note.file_url}`} target="_blank" rel="noopener noreferrer">
                        📎 Pobierz załącznik
                      </a>
                    </div>
                  )}
                  {note.reminder_at && (
                    <div style={{ marginTop: 6, color: due ? "#ffa726" : "inherit" }}>
                      ⏰ Przypomnienie: {new Date(note.reminder_at).toLocaleString()}
                    </div>
                  )}
                  <br />
                  <button
                    onClick={() => startEdit(note)}
                    style={{
                      background: "#1976d2",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 12px",
                      cursor: "pointer",
                      marginRight: 8,
                      marginTop: 8,
                    }}
                  >
                    Edytuj
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    style={{
                      background: "#d32f2f",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 12px",
                      cursor: "pointer",
                      marginTop: 8,
                    }}
                  >
                    Usuń
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default App;
