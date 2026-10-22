
from io import BytesIO

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from image_tools import process_image


router = APIRouter(prefix="/image-tools", tags=["Image Tools"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_INPUT_FORMATS = {"JPEG", "PNG", "WEBP"}
OUTPUT_FORMATS = {"JPEG", "PNG", "WEBP"}


@router.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    output_format: str = Query(default="JPEG"),
    quality: int = Query(default=75, ge=1, le=95),
):
    output_format = output_format.upper()

    if output_format not in OUTPUT_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Output format must be JPEG, PNG, or WEBP.",
        )

    # Read at most 10 MB + 1 byte to detect oversized uploads.
    data = await file.read(MAX_UPLOAD_BYTES + 1)

    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image must be 10 MB or smaller.",
        )

    try:
        from PIL import Image

        with Image.open(BytesIO(data)) as image:
            detected_format = image.format

        if detected_format not in ALLOWED_INPUT_FORMATS:
            raise HTTPException(
                status_code=415,
                detail="Upload a valid JPEG, PNG, or WEBP image.",
            )

        result = process_image(data, output_format, quality)

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not process this image.",
        ) from exc

    content_types = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
    }
    extensions = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}

    return StreamingResponse(
        BytesIO(result),
        media_type=content_types[output_format],
        headers={
            "Content-Disposition": (
                f'attachment; filename="converted.{extensions[output_format]}"'
            ),
            "X-Original-Size": str(len(data)),
            "X-Processed-Size": str(len(result)),
        },
    )
