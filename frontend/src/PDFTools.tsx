import { useState } from "react";

interface CompressionResult {
  originalSize: number;
  processedSize: number;
  reductionPercent: number;
  reduced: boolean;
  targetSizeKB?: number;
  targetReached?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function PDFTools() {
  const [file, setFile] = useState<File | null>(null);
  const [targetSizeKB, setTargetSizeKB] = useState<number>(180);
  const [loading, setLoading] = useState(false);
  const [compressionMode, setCompressionMode] = useState<
    "regular" | "target" | null
  >(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompressionResult | null>(null);

  async function processPDF(mode: "regular" | "target") {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    if (
      mode === "target" &&
      (!Number.isFinite(targetSizeKB) || targetSizeKB <= 0)
    ) {
      setError("Please enter a target size greater than zero KB.");
      return;
    }

    setLoading(true);
    setCompressionMode(mode);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      let endpoint = "http://localhost:8000/pdf/compress";

      if (mode === "target") {
        endpoint = "http://localhost:8000/pdf/compress-to-target";
        formData.append("target_size_kb", String(targetSizeKB));
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "PDF compression failed.";

        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // Keep the default message if the response is not JSON.
        }

        throw new Error(message);
      }

      const originalSize = Number(
        response.headers.get("X-Original-Size")
      );

      const processedSize = Number(
        response.headers.get("X-Processed-Size")
      );

      if (
        !Number.isFinite(originalSize) ||
        !Number.isFinite(processedSize) ||
        originalSize <= 0 ||
        processedSize <= 0
      ) {
        throw new Error(
          "The server returned invalid PDF size information."
        );
      }

      const reductionPercent = Number(
        (
          ((originalSize - processedSize) / originalSize) *
          100
        ).toFixed(2)
      );

      const reduced = processedSize < originalSize;

      const targetReached =
        mode === "target"
          ? response.headers.get("X-Target-Met") === "true"
          : undefined;

      const pdfBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");

      const baseName = file.name.replace(/\.pdf$/i, "");
      link.href = downloadUrl;
      link.download =
        mode === "target"
          ? `${baseName}_target_compressed.pdf`
          : `${baseName}_optimized.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Delay URL cleanup so the browser can begin the download.
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      setResult({
        originalSize,
        processedSize,
        reductionPercent,
        reduced,
        targetSizeKB:
          mode === "target" ? targetSizeKB : undefined,
        targetReached,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while processing the PDF."
      );
    } finally {
      setLoading(false);
      setCompressionMode(null);
    }
  }

  return (
    <div className="pdf-tools">
      <div className="pdf-upload">
        <label htmlFor="pdf-file">Select a PDF document</label>

        <input
          id="pdf-file"
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null;

            setFile(selectedFile);
            setError("");
            setResult(null);
          }}
        />

        {file && (
          <p>
            Selected: <strong>{file.name}</strong>
            <br />
            Original size: {formatFileSize(file.size)}
          </p>
        )}
      </div>

      <div className="pdf-compression-actions">
        <button
          type="button"
          onClick={() => processPDF("regular")}
          disabled={!file || loading}
        >
          {loading && compressionMode === "regular"
            ? "Processing PDF..."
            : "Compress PDF"}
        </button>

        <div className="target-size-control">
          <label htmlFor="target-size">
            Target PDF size (KB)
          </label>

          <input
            id="target-size"
            type="number"
            min="1"
            step="1"
            value={targetSizeKB}
            onChange={(event) => {
              setTargetSizeKB(Number(event.target.value));
              setError("");
              setResult(null);
            }}
            disabled={loading}
          />

          <button
            type="button"
            onClick={() => processPDF("target")}
            disabled={!file || loading}
          >
            {loading && compressionMode === "target"
              ? "Compressing to target..."
              : "Compress to Target Size"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {result && (
        <div className="compression-result" role="status">
          <h4>PDF Processing Complete</h4>

          <p>
            Original size: {formatFileSize(result.originalSize)}
          </p>

          <p>
            Processed size: {formatFileSize(result.processedSize)}
          </p>

          <p>
            Size reduced by {result.reductionPercent}%.
          </p>

          {result.targetSizeKB !== undefined && (
            <>
              <p>
                Requested target: {result.targetSizeKB} KB
              </p>

              {result.targetReached ? (
                <p>
                  Success! The PDF reached the requested target size.
                </p>
              ) : (
                <p>
                  The target could not be reached. This is the
                  smallest file found during the compression attempts.
                </p>
              )}
            </>
          )}

          <p>Your processed PDF has been downloaded.</p>
        </div>
      )}
    </div>
  );
}

export default PDFTools;