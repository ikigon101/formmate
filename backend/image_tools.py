
from io import BytesIO

from PIL import Image, ImageOps


SUPPORTED_FORMATS = {
    "JPEG": "JPEG",
    "JPG": "JPEG",
    "PNG": "PNG",
    "WEBP": "WEBP",
}

MAX_IMAGE_PIXELS = 25_000_000


def process_image(
    image_bytes: bytes,
    output_format: str = "JPEG",
    quality: int = 75,
) -> bytes:
    """Convert an image to a supported format and compress it."""

    output_format = output_format.upper()

    if output_format not in SUPPORTED_FORMATS:
        raise ValueError("Choose JPEG, PNG, or WEBP.")

    if not 1 <= quality <= 95:
        raise ValueError("Quality must be between 1 and 95.")

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise ValueError("Image dimensions are too large.")

            image.verify()

        # Reopen the image after verify(), which invalidates the image object.
        with Image.open(BytesIO(image_bytes)) as image:
            image = ImageOps.exif_transpose(image)
            image.load()

            target = SUPPORTED_FORMATS[output_format]
            buffer = BytesIO()

            if target == "JPEG":
                # JPEG does not support transparency.
                if image.mode in ("RGBA", "LA") or "transparency" in image.info:
                    image = image.convert("RGBA")
                    background = Image.new(
                        "RGB", image.size, (255, 255, 255)
                    )
                    background.paste(image, mask=image.getchannel("A"))
                    image = background
                else:
                    image = image.convert("RGB")

                image.save(
                    buffer,
                    format="JPEG",
                    quality=quality,
                    optimize=True,
                )

            elif target == "PNG":
                image.save(buffer, format="PNG", optimize=True)

            elif target == "WEBP":
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

                image.save(
                    buffer,
                    format="WEBP",
                    quality=quality,
                    method=6,
                )

            return buffer.getvalue()

    except (Image.UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise ValueError("The uploaded file is not a valid supported image.") from exc

def process_image_to_target_size(
    image_bytes: bytes,
    output_format: str = "JPEG",
    quality: int = 75,
    target_size_bytes: int = 100 * 1024,
) -> tuple[bytes, bool, int]:
    """Compress an image toward a target size using binary search.

    Returns:
        Processed image bytes, whether the target was met,
        and the quality setting used.
    """

    if target_size_bytes <= 0:
        raise ValueError("Target size must be greater than zero.")

    if not 1 <= quality <= 95:
        raise ValueError("Quality must be between 1 and 95.")

    output_format = output_format.upper()

    # Try the requested quality first.
    best_result = process_image(
        image_bytes,
        output_format,
        quality,
    )
    best_quality = quality

    # Target already achieved.
    if len(best_result) <= target_size_bytes:
        return best_result, True, best_quality

    # PNG output does not use the quality setting.
    if output_format == "PNG":
        return best_result, False, best_quality

    # Check the lowest permitted quality.
    smallest_result = process_image(
        image_bytes,
        output_format,
        1,
    )

    if len(smallest_result) > target_size_bytes:
        return smallest_result, False, 1

    # Binary search for the highest quality that meets the target.
    low = 1
    high = quality - 1

    best_result = smallest_result
    best_quality = 1

    while low <= high:
        mid = (low + high) // 2

        candidate = process_image(
            image_bytes,
            output_format,
            mid,
        )

        if len(candidate) <= target_size_bytes:
            best_result = candidate
            best_quality = mid
            low = mid + 1
        else:
            high = mid - 1

    return best_result, True, best_quality