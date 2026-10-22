
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
