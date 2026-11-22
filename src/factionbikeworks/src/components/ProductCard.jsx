import { Link } from "react-router";
import { useTilt } from "../lib/motion";
import { assetUrl } from "../lib/api";
import { cardPrice, formatRM, priceRange, productImages, stockState, totalStock } from "../lib/shop";
import { ArrowUpRight, Torx } from "./ui/Icons";

export default function ProductCard({ product, index = 0, tilt = true }) {
  const ref = useTilt(tilt ? 6 : 0);
  const imgs = productImages(product).map(assetUrl);
  const { min, max } = priceRange(product);
  const stock = stockState(totalStock(product), product.lowStockThreshold);
  const sale = cardPrice(product);
  const variants = product.variations?.length || 0;

  return (
    <Link to={`/viewProduct/${product.id}`} className={`pcard ${stock.key === "out" ? "is-out" : ""}`} style={{ "--i": index % 12 }}>
      <div className="pcard-tilt" ref={ref}>
        <div className="pcard-media">
          {imgs[0] ? (
            <>
              <img src={imgs[0]} alt="" loading="lazy" className="pcard-img pcard-img--a" />
              {imgs[1] && <img src={imgs[1]} alt="" loading="lazy" className="pcard-img pcard-img--b" />}
            </>
          ) : (
            <div className="pcard-img pcard-img--empty">
              <Torx />
            </div>
          )}
          <span className={`tag tag--${stock.key} pcard-stock`}>
            <i /> {stock.label}
          </span>
          {variants > 1 && <span className="tag pcard-variants">{variants} options</span>}
          {sale.was && <span className="tag tag--sale pcard-sale">Sale</span>}
        </div>
        <div className="pcard-body">
          <span className="pcard-brand mono">{product.brand}</span>
          <h3 className="pcard-name">{product.name}</h3>
          <div className="pcard-foot">
            <span className="pcard-price">
              {min !== max && <small>from </small>}
              {formatRM(min)}
              {sale.was && sale.price === min && <s className="price-was">{formatRM(sale.was)}</s>}
            </span>
            <span className="pcard-go" aria-hidden>
              <ArrowUpRight />
            </span>
          </div>
        </div>
        <div className="pcard-spot" aria-hidden />
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="pcard is-skeleton" aria-hidden>
      <div className="pcard-tilt">
        <div className="pcard-media skeleton" />
        <div className="pcard-body">
          <div className="skeleton" style={{ height: 10, width: "35%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 20, width: "85%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 18, width: "40%", borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}
