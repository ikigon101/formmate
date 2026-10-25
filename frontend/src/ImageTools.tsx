

import { useEffect, useRef, useState } from "react";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ImageTools() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("JPEG");
  const [quality, setQuality] = useState(75);
  const [useTargetSize, setUseTargetSize] = useState(false);
  const [targetSizeKb, setTargetSizeKb] = useState(100);
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create a preview URL and release it when the file changes.
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Release the previous download URL when replaced or cleared.
  useEffect(() => {
    if (!downloadUrl) return;

    return () => URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  function clearDownload() {
    setDownloadUrl("");
    setDownloadName("");
  }

  function selectFile(selectedFile: File | undefined) {
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setStatus("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }

    if (selectedFile.size > MAX_FILE_BYTES) {
      setStatus("This image is larger than 10 MB. Please choose a smaller image.");
      return;
    }

    if (selectedFile.size === 0) {
      setStatus("This file is empty. Please choose another image.");
      return;
    }

    setFile(selectedFile);
    setStatus("");
    clearDownload();
  }

  function resetImage() {
    setFile(null);
    setStatus("");
    clearDownload();
    setDragging(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function convertImage() {
    if (!file) {
      setStatus("Please choose an image first.");
      return;
    }

    setBusy(true);
    setStatus("Processing your image...");
    clearDownload();

    try {
      const formData = new FormData();
      formData.append("file", file);
      const queryParams = new URLSearchParams({
        output_format: format,
        quality: String(quality),
      });
      if (useTargetSize) {
        if (
           !Number.isInteger(targetSizeKb) ||
            targetSizeKb < 1 ||
            targetSizeKb > 10240
          ) {
            throw new Error(
                "Target size must be a whole number between 1 and 10,240 KB."
            );
          }
          queryParams.set("target_size_kb", String(targetSizeKb));
      }
      const response = await fetch(
        `http://localhost:8000/image-tools/convert?${queryParams.toString()}`,
        {
            method: "POST",
            body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Image conversion failed."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const extensions: Record<string, string> = {
        JPEG: "jpg",
        PNG: "png",
        WEBP: "webp",
      };

      setDownloadName(`converted.${extensions[format]}`);
      setDownloadUrl(url);

      const difference = file.size - blob.size;
      const resultMessage =
        difference > 0
          ? `Size reduced by ${formatFileSize(difference)}.`
          : difference < 0
            ? `Output is ${formatFileSize(Math.abs(difference))} larger.`
            : "The output file is the same size.";

           const targetMet = response.headers.get("X-Target-Met");
      const actualQuality = response.headers.get("X-Actual-Quality");

      let targetMessage = "";

      if (useTargetSize) {
        if (targetMet === "true") {
          targetMessage =
            ` Target reached! Your image is within ${targetSizeKb} KB.`;
        } else if (targetMet === "false") {
          targetMessage =
            ` Target not reached. The image could not be compressed to ${targetSizeKb} KB.`;
        } else {
          targetMessage =
            " The target-size result could not be confirmed.";
        }

        if (actualQuality !== null) {
          targetMessage += ` Quality used: ${actualQuality}.`;
        }
      }

      setStatus(
        `Conversion successful! Original: ${formatFileSize(file.size)}. Converted: ${formatFileSize(blob.size)}. ${resultMessage}${targetMessage}`
      );
    
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="feature">
      <h2>Image converter and compressor</h2>

      <p>
        Convert JPEG, PNG, or WEBP images, preview your selection,
        and adjust compression quality.
      </p>

      <label htmlFor="image-file">Choose an image</label>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files[0]);
        }}
        style={{
          padding: "20px",
          border: dragging
            ? "2px dashed #137a50"
            : "2px dashed #b9d9c4",
          borderRadius: "14px",
          background: dragging ? "#e8f5ec" : "#f5fbf6",
          textAlign: "center",
          margin: "10px 0 18px",
        }}
      >
        <p>
          {dragging
            ? "Drop your image here"
            : "Drag and drop an image here, or choose a file below."}
        </p>

        <input
          ref={fileInputRef}
          id="image-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            selectFile(event.target.files?.[0])
          }
        />

        <p>Supported formats: JPEG, PNG, WEBP. Maximum size: 10 MB.</p>
      </div>

      {file && previewUrl && (
        <div style={{ marginBottom: "20px" }}>
          <h3>Image preview</h3>

          <img
            src={previewUrl}
            alt="Preview of the selected image"
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "300px",
              objectFit: "contain",
              borderRadius: "12px",
              marginBottom: "14px",
            }}
          />

          <p><strong>File name:</strong> {file.name}</p>
          <p>
            <strong>Format:</strong>{" "}
            {file.type.replace("image/", "").toUpperCase()}
          </p>
          <p><strong>File size:</strong> {formatFileSize(file.size)}</p>

          <button
            type="button"
            onClick={resetImage}
            disabled={busy}
          >
            Clear image
          </button>
        </div>
      )}
      
      <div style={{ margin: "20px 0" }}>
        <label htmlFor="use-target-size">
          <input
            id="use-target-size"
            type="checkbox"
            checked={useTargetSize}
            onChange={(event) => {
              setUseTargetSize(event.target.checked);
              clearDownload();
              setStatus("");
            }}
            disabled={busy}
          />
          {" "}Compress to a target file size
        </label>

        {useTargetSize && (
          <div style={{ marginTop: "12px" }}>
            <label htmlFor="target-size-kb">
              Target size (KB)
            </label>
            <br />

            <input
              id="target-size-kb"
              type="number"
              min="1"
              max="10240"
              value={targetSizeKb}
              onChange={(event) => {
                setTargetSizeKb(Number(event.target.value));
                clearDownload();
                setStatus("");
              }}
              disabled={busy}
            />

            <p>
              Choose a maximum size between 1 KB and 10,240 KB.
              The output may exceed this target if it cannot be reached.
            </p>
          </div>
        )}
      </div>


      <label htmlFor="output-format">Output format</label>
      <br />

      <select
        id="output-format"
        value={format}
        onChange={(event) => {
          setFormat(event.target.value);
          clearDownload();
          setStatus("");
        }}
        disabled={busy}
      >
        <option value="JPEG">JPEG</option>
        <option value="PNG">PNG</option>
        <option value="WEBP">WEBP</option>
      </select>

      <br /><br />

      <label htmlFor="quality">
        Quality: {quality}
        {format === "PNG" ? " (not used for PNG output)" : ""}
      </label>
      <br />

      <input
        id="quality"
        type="range"
        min="1"
        max="95"
        value={quality}
        onChange={(event) => {
          setQuality(Number(event.target.value));
          clearDownload();
          setStatus("");
        }}
        disabled={busy}
      />

      <br />

      <button
        type="button"
        onClick={convertImage}
        disabled={busy || !file}
      >
        {busy ? "Processing..." : "Convert image"}
      </button>

      <p role="status" aria-live="polite">{status}</p>

      {downloadUrl && (
        <a href={downloadUrl} download={downloadName}>
          Download converted image
        </a>
      )}
    </section>
  );
}

export default ImageTools;
