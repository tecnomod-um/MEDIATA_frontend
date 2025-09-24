import React, { useEffect, useRef, useState } from "react";
import LandingImageStyles from "./landingImage.module.css";

const LandingImage = ({ imageSrc, width, height, maintainAspectRatio = false, addDarkBorder = false }) => {
  const [animationOffset, setAnimationOffset] = useState(1);
  const imageRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const imageElement = imageRef.current;
      if (imageElement) {
        const { innerHeight } = window;
        const { top, height } = imageElement.getBoundingClientRect();
        const offset = innerHeight - top;

        if (offset > 0 && offset < innerHeight + height)
          setAnimationOffset(Math.min(offset / (innerHeight / 3), 1));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const imageStyle = maintainAspectRatio
    ? { maxWidth: '100%', maxHeight: '100%' }
    : { width: width, height: height };

  let imageContainerClass = LandingImageStyles.image;
  if (addDarkBorder) {
    imageContainerClass += ` ${LandingImageStyles.darkShadow}`;
  }

  return (
    <div className={imageContainerClass} style={{ opacity: animationOffset }}>
      <img ref={imageRef} src={imageSrc} alt="Sample" style={imageStyle} />
    </div>
  );
}

export default React.memo(LandingImage);
