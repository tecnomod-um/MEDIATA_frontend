import React, { useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SlideStyles from './slide.module.css';
import useScrollFade from '../../../hooks/useScrollFade';

const Slide = ({ images, steps }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { ref, style } = useScrollFade();

  const changeSlide = (index) => setCurrentStep(index);
  const nextSlide = () => images.length && setCurrentStep(c => (c + 1) % images.length);
  const prevSlide = () => images.length && setCurrentStep(c => (c - 1 + images.length) % images.length);

  const iconStyle = { fontSize: '4rem' };
  const disableArrows = images.length <= 1;

  return (
    <div ref={ref} className={SlideStyles.slideContainer} style={style}>
      <div className={SlideStyles.imageContainer} role="region" aria-label="Slide images">
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Slide ${index + 1}`}
            className={`${SlideStyles.slideImage} ${index === currentStep ? SlideStyles.active : ''}`}
          />
        ))}

        <button
          className={`${SlideStyles.arrow} ${SlideStyles.left}`}
          onClick={prevSlide}
          aria-label="Previous slide"
          aria-disabled={disableArrows}
          disabled={disableArrows}
          type="button"
        >
          <ChevronLeftIcon style={iconStyle} />
        </button>
        <button
          className={`${SlideStyles.arrow} ${SlideStyles.right}`}
          onClick={nextSlide}
          aria-label="Next slide"
          aria-disabled={disableArrows}
          disabled={disableArrows}
          type="button"
        >
          <ChevronRightIcon style={iconStyle} />
        </button>
      </div>

      <div className={SlideStyles.slideTextContainer}>
        <p className={SlideStyles.slideText} role="status" aria-label="Slide text">
          {steps[currentStep]}
        </p>
      </div>

      <div className={SlideStyles.controls} role="group" aria-label="Slide controls">
        {images.map((_, index) => (
          <button
            key={index}
            className={`${SlideStyles.controlButton} ${index === currentStep ? SlideStyles.activeControl : ''}`}
            onClick={() => changeSlide(index)}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Slide;
