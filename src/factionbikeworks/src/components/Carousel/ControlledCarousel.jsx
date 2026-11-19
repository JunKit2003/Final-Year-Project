import { useEffect, useState } from "react";
import { assetUrl } from "../../lib/api";
import { ChevronLeft, ChevronRight } from "../ui/Icons";

// Small dependency-free replacement for react-responsive-carousel (unmaintained, not React 19 safe).
// Same props as before: an array of image URLs.
const ControlledCarousel = ({ images = [] }) => {
  const [i, setI] = useState(0);
  const n = images.length;

  useEffect(() => {
    if (n < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), 3000);
    return () => clearInterval(t);
  }, [n]);

  if (!n) return null;
  const go = (d) => setI((x) => (x + d + n) % n);

  return (
    <div className="mini-carousel">
      {images.map((src, k) => (
        <img key={src + k} src={assetUrl(src)} alt={`Slide ${k + 1}`} className={k === i ? "is-on" : ""} />
      ))}
      {n > 1 && (
        <>
          <button type="button" className="icon-btn mini-prev" onClick={() => go(-1)} aria-label="Previous image">
            <ChevronLeft />
          </button>
          <button type="button" className="icon-btn mini-next" onClick={() => go(1)} aria-label="Next image">
            <ChevronRight />
          </button>
          <div className="mini-dots">
            {images.map((_, k) => (
              <button key={k} type="button" className={k === i ? "is-on" : ""} onClick={() => setI(k)} aria-label={`Image ${k + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ControlledCarousel;
