from io import BytesIO

import pikepdf

from pdf_tools import compress_pdf


def create_test_pdf() -> bytes:
    buffer = BytesIO()

    with pikepdf.new() as pdf:
        pdf.add_blank_page(page_size=(595, 842))
        pdf.save(buffer)

    return buffer.getvalue()


def main():
    original_pdf = create_test_pdf()

    result = compress_pdf(original_pdf)

    print("PDF compression test passed!")
    print(f"Original size: {result['original_size']} bytes")
    print(f"Processed size: {result['processed_size']} bytes")
    print(f"Size reduction: {result['reduction_percent']}%")
    print(f"Reduced: {result['reduced']}")

    assert result["pdf_bytes"].startswith(b"%PDF-")
    assert result["processed_size"] > 0


if __name__ == "__main__":
    main()