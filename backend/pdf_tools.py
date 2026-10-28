from io import BytesIO

import pymupdf


def compress_pdf(input_bytes: bytes) -> dict:
    """
    Optimize a PDF and recompress embedded images.

    Returns the processed PDF and size information.
    Keeps the original if processing does not reduce its size.
    """

    if not input_bytes:
        raise ValueError("The uploaded PDF is empty.")

    original_size = len(input_bytes)

    try:
        with pymupdf.open(
            stream=input_bytes,
            filetype="pdf",
        ) as pdf:

            # Recompress embedded images and reduce the resolution
            # of images whose resolution exceeds the threshold.
            pdf.rewrite_images(
                dpi_threshold=150,
                dpi_target=120,
                quality=75,
            )

            output_buffer = BytesIO()

            pdf.save(
                output_buffer,
                garbage=4,
                deflate=True,
                deflate_images=True,
                deflate_fonts=True,
                use_objstms=True,
            )

            processed_bytes = output_buffer.getvalue()

    except Exception as exc:
        raise ValueError(
            "The PDF could not be processed. "
            "Please check that it is a valid PDF."
        ) from exc

    # Never return a larger file when compression fails to help.
    if len(processed_bytes) >= original_size:
        processed_bytes = input_bytes

    processed_size = len(processed_bytes)
    saved_bytes = original_size - processed_size
    print(f"DEBUG sizes: original={original_size}, processed={processed_size}")
    print(f"DEBUG saved={saved_bytes}, reduction={saved_bytes / original_size * 100:.2f}%")

    return {
        "pdf_bytes": processed_bytes,
        "original_size": original_size,
        "processed_size": processed_size,
        "saved_bytes": saved_bytes,
        "reduction_percent": round(
            saved_bytes / original_size * 100,
            2,
        ),
        "reduced": processed_size < original_size,
    }
def compress_pdf_to_target(
    input_bytes: bytes,
    target_size_kb: float,
) -> dict:
    """
    Compress a PDF toward a requested target size in KB.

    Returns the smallest valid PDF found and reports whether
    the target size was reached.
    """

    if not input_bytes:
        raise ValueError("The uploaded PDF is empty.")

    if target_size_kb <= 0:
        raise ValueError("Target size must be greater than zero KB.")

    original_size = len(input_bytes)
    target_size_bytes = int(target_size_kb * 1024)

    best_bytes = input_bytes

    # Try progressively lower image resolutions and quality.
    compression_settings = [
        (150, 120, 75),
        (120, 96, 65),
        (96, 72, 55),
        (72, 50, 40),
    ]

    try:
        for dpi_threshold, dpi_target, quality in compression_settings:
            with pymupdf.open(
                stream=input_bytes,
                filetype="pdf",
            ) as pdf:
                pdf.rewrite_images(
                    dpi_threshold=dpi_threshold,
                    dpi_target=dpi_target,
                    quality=quality,
                )

                output_buffer = BytesIO()

                pdf.save(
                    output_buffer,
                    garbage=4,
                    deflate=True,
                    deflate_images=True,
                    deflate_fonts=True,
                    use_objstms=True,
                )

                candidate_bytes = output_buffer.getvalue()

            if len(candidate_bytes) < len(best_bytes):
                best_bytes = candidate_bytes

            if len(best_bytes) <= target_size_bytes:
                break

    except Exception as exc:
        raise ValueError(
            "The PDF could not be compressed to the requested size."
        ) from exc

    processed_size = len(best_bytes)
    target_reached = processed_size <= target_size_bytes

    return {
        "pdf_bytes": best_bytes,
        "original_size": original_size,
        "processed_size": processed_size,
        "target_size_bytes": target_size_bytes,
        "target_reached": target_reached,
        "saved_bytes": original_size - processed_size,
        "reduction_percent": round(
            (original_size - processed_size) / original_size * 100,
            2,
        ),
    }