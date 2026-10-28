
import { useState } from "react";
import "./App.css";
import ImageTools from "./ImageTools";
import PDFTools from "./PDFTools";

function App() {
  const [status, setStatus] = useState("Not connected");
  const [showDocumentTools, setShowDocumentTools] = useState(false);

  async function checkBackend() {
    setStatus("Checking...");

    try {
      const response = await fetch("http://localhost:8000/health");

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
      <header>
        <p className="eyebrow">YOUR APPLICATION COMPANION</p>

        <h1>FormMate</h1>

        <p className="intro">
          Prepare documents. Understand requirements.
          Complete forms with confidence.
        </p>
      </header>

      <section className="feature">
        <h2>Document Fixer</h2>

        <p>
          Prepare your documents for online applications.
          Convert images and reduce file sizes before uploading.
        </p>

        <button
          type="button"
          onClick={() => setShowDocumentTools(!showDocumentTools)}
          aria-expanded={showDocumentTools}
        >
          {showDocumentTools
            ? "Hide Document Tools"
            : "Open Document Tools"}
        </button>

        {showDocumentTools && (
          <div className="document-tools">
            <h3>Image Converter &amp; Compressor</h3>

            <ImageTools />

            <div className="document-tool">
              <h3>PDF Compressor</h3>
              <p>
                Reduce PDF file sizes to help meet document upload limits.
              </p>
              <PDFTools />
            </div>

            <div className="coming-soon">
              <h3>File Validator</h3>
              <p>
                File type and size validation will be added here.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="feature">
        <h2>Application Checklist</h2>
        <p>
          Track the documents and information you still need.
        </p>
      </section>

      <section className="feature">
        <h2>Form Guide</h2>
        <p>
          Understand application instructions with AI assistance.
        </p>
      </section>

      <footer>
        <button type="button" onClick={checkBackend}>
          Test Backend Connection
        </button>

        <p role="status">Backend: {status}</p>
      </footer>
    </main>
  );
}

export default App;