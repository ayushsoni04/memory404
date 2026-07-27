import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify } from "../lib/seo";

describe("slugify (Yoast/Shopify practices)", () => {
  it("lowercases and hyphenates", () => {
    assert.equal(slugify("WordPress SEO Tips"), "wordpress-seo-tips");
  });

  it("strips stop words and stays short", () => {
    assert.equal(
      slugify("How to create the best SEO strategy"),
      "create-best-seo-strategy",
    );
  });

  it("removes special characters", () => {
    assert.equal(slugify("Organic Cotton T-Shirt!"), "organic-cotton-t-shirt");
  });

  it("does not use underscores", () => {
    assert.equal(slugify("organic_cotton_t_shirt"), "organic-cotton-t-shirt");
  });

  it("caps word count", () => {
    assert.equal(
      slugify("best wordpress seo plugin guide tutorial 2025", { maxWords: 4 }),
      "best-wordpress-seo-plugin",
    );
  });
});
