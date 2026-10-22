
import { useState } from "react";
import "./App.css";
import ImageTools from "./ImageTools";

function App() {
  const [status, setStatus] = useState("Not connected");

  async function checkBackend() {
    setStatus("Checking...");

    try {
      const response = await fetch(
        "http://localhost:8000/health"
      );

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();
      setStatus(`${data.project}: ${data.status}`);
    } catch {
      setStatus("Could not connect. Is the backend running?");
    }
  }

  return (
    <main className="app">
      <p className="eyebrow">YOUR APPLICATION COMPANION</p>
      <h1>FormMate</h1>
      <p className="intro">
        Prepare documents. Understand requirements.
        Complete forms with confidence.
      </p>

      <section className="feature">
        <h2>Document fixer</h2>
        <p>Compress and validate documents before uploading.</p>
      </section>

      <section className="feature">
        <h2>Application checklist</h2>
        <p>Track the documents and information you still need.</p>
      </section>

      <section className="feature">
        <h2>Form guide</h2>
        <p>Understand application instructions with AI assistance.</p>
      </section>
      <ImageTools />

      <button onClick={checkBackend}>
        Test backend connection
      </button>

      <p role="status">Backend: {status}</p>
    </main>
  );
}

export default App;
