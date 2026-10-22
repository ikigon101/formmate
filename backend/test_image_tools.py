
from io import BytesIO

from PIL import Image

from image_tools import process_image


# Create a small sample image for testing.
sample = Image.new("RGB", (200, 200), color="skyblue")
input_buffer = BytesIO()
sample.save(input_buffer, format="PNG")
original_bytes = input_buffer.getvalue()

# Convert the sample PNG to JPEG.
result = process_image(
    image_bytes=original_bytes,
    output_format="JPEG",
    quality=75,
)

# Verify that the output is a readable JPEG.
with Image.open(BytesIO(result)) as output:
    print("Output format:", output.format)
    print("Output dimensions:", output.size)
    print("Original size:", len(original_bytes), "bytes")
    print("Processed size:", len(result), "bytes")

print("Image conversion test passed!")
