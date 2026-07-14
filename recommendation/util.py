"""Small, dependency-free helpers shared across the recommendation service.

Kept free of heavy imports (lightfm, numpy, DB drivers) so the pure logic
here can be unit-tested quickly in CI.
"""


def product_image_url(product_id: str) -> str:
    """Storage path for a specific product's image."""
    return f"/api/storage/{product_id}.png"


def category_image_url(category_id: str) -> str:
    """Storage path for a category placeholder image.

    Used when recommending items by category (e.g. cold-start / popular
    fallbacks) where a per-product image is not resolved.
    """
    return f"/api/storage/category_{category_id}.png"
