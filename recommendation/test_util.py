from util import product_image_url, category_image_url


def test_product_image_url():
    assert product_image_url("abc-123") == "/api/storage/abc-123.png"


def test_category_image_url():
    assert category_image_url("42") == "/api/storage/category_42.png"


def test_urls_are_distinct_namespaces():
    # A product image and a category image for the same id must not collide.
    assert product_image_url("5") != category_image_url("5")
