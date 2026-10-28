from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from pdf_tools import compress_pdf, compress_pdf_to_target

router = APIRouter(prefix="/pdf", tags=["PDF Tools"])


@router.post("/compress")
async def compress_pdf_endpoint(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file.",
        )

    input_bytes = await file.read()

    if not input_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    try:
        result = compress_pdf(input_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    original_filename = file.filename.rsplit(".", 1)[0]
    download_filename = f"{original_filename}_optimized.pdf"
    print(
    f"PDF DEBUG: original={result['original_size']}, "
    f"processed={result['processed_size']}, "
    f"reduction={result['reduction_percent']}%, "
    f"reduced={result['reduced']}"
)

    return Response(
        content=result["pdf_bytes"],
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{download_filename}"'
            ),
            "X-Original-Size": str(result["original_size"]),
            "X-Processed-Size": str(result["processed_size"]),
            "X-Reduction-Percent": str(result["reduction_percent"]),
            "X-Reduced": str(result["reduced"]).lower(),
        },
    )
@router.post("/compress-to-target")
async def compress_pdf_to_target_endpoint(
    file: UploadFile = File(...),
    target_size_kb: float = 180,
):
    """
    Compress a PDF toward a user-specified target size in KB.
    """

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file.",
        )

    if target_size_kb <= 0:
        raise HTTPException(
            status_code=400,
            detail="Target size must be greater than zero KB.",
        )

    input_bytes = await file.read()

    if not input_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    try:
        result = compress_pdf_to_target(
            input_bytes,
            target_size_kb,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    original_filename = file.filename.rsplit(".", 1)[0]
    download_filename = f"{original_filename}_target_compressed.pdf"

    return Response(
        content=result["pdf_bytes"],
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{download_filename}"'
            ),
            "X-Original-Size": str(result["original_size"]),
            "X-Processed-Size": str(result["processed_size"]),
            "X-Reduction-Percent": str(result["reduction_percent"]),
            "X-Target-Size": str(result["target_size_bytes"]),
            "X-Target-Met": str(result["target_reached"]).lower(),
            "Access-Control-Expose-Headers": (
                "X-Original-Size, X-Processed-Size, "
                "X-Reduction-Percent, X-Target-Size, X-Target-Met"
            ),
        },
    )