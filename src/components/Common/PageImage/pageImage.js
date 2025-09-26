import React from "react";
import PageImageStyles from "./pageImage.module.css";
import useScrollFade from "../../../hooks/useScrollFade.js";

const PageImage = ({ imageSrc, width, height, maintainAspectRatio = false, addDarkBorder = false }) => {
  const { ref, style } = useScrollFade();

  const imageStyle = maintainAspectRatio
    ? { maxWidth: '100%', maxHeight: '100%' }
    : { width, height };

  let imageContainerClass = PageImageStyles.image;
  if (addDarkBorder) imageContainerClass += ` ${PageImageStyles.darkShadow}`;

  return (
    <div
      className={imageContainerClass}
      style={style}
      role="img"
      aria-label="Page image container"
    >
      <img
        ref={ref}
        src={imageSrc}
        alt="Sample"
        style={imageStyle}
        aria-describedby="page-image-description"
      />
    </div>
  );
}

export default React.memo(PageImage);
