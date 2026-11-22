import { useEffect, useMemo, useState } from "react";
import api, { assetUrl } from "../lib/api";
import { useProducts } from "../lib/store";
import { useSite } from "../lib/site";
import { countBy, filterProducts } from "../lib/shop";
import { BrandMarquee, BrandWall, CategoryGrid, FreshIn, HomeHero, Numbers, PromiseStrip, Visit } from "../components/sections/Home";

export function useBanners() {
  const [banners, setBanners] = useState([]);
  useEffect(() => {
    api
      .post("/api/banner/get", {})
      .then((res) =>
        setBanners(
          (res.data?.banners || [])
            .map((b) => ({ src: assetUrl(b.imageUrl), alt: b.alt || "", linkUrl: b.linkUrl || "" }))
            .filter((b) => b.src)
        )
      )
      .catch(() => setBanners([]));
  }, []);
  return banners;
}

export function useBrands() {
  const [brands, setBrands] = useState([]);
  useEffect(() => {
    api
      .post("/api/product/getBrandImages", {})
      .then((res) => setBrands(res.data?.brands || []))
      .catch(() => setBrands([]));
  }, []);
  return brands;
}

/** Live data the home sections show, shared with the admin previews. */
export function useHomeData() {
  const { products, loading } = useProducts();
  const banners = useBanners();
  const brands = useBrands();
  const fresh = useMemo(() => filterProducts(products, { sort: "featured", inStock: true }), [products]);
  const categories = useMemo(() => countBy(products, "category").sort((a, b) => b.count - a.count), [products]);
  const brandNames = brands.length ? brands.map((b) => b.brandName) : countBy(products, "brand").map((b) => b.name);
  return { products, loading, banners, brands, fresh, categories, brandNames };
}

export default function Home() {
  const site = useSite();
  const d = useHomeData();
  const common = { shop: site.shop, hours: site.hours };
  return (
    <div className="page home">
      <HomeHero content={site["content.home.hero"]} {...common} banners={d.banners} productCount={d.products.length} brandCount={d.brandNames.length} />
      <BrandMarquee content={site["content.home.brands"]} names={d.brandNames} />
      <BrandWall content={site["content.home.brands"]} brands={d.brands} />
      <FreshIn content={site["content.home.fresh"]} products={d.fresh} loading={d.loading} />
      <CategoryGrid content={site["content.home.categories"]} categories={d.categories} />
      <PromiseStrip content={site["content.home.promise"]} />
      <Numbers content={site["content.home.numbers"]} shop={site.shop} productCount={d.products.length} brandCount={d.brandNames.length} />
      <Visit content={site["content.home.visit"]} {...common} />
    </div>
  );
}
