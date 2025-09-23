import React, { useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import styles from './slide.module.css';

const Slide = ({ images, steps }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const changeSlide = (index) => setCurrentStep(index);

  const nextSlide = () => {
    if (!images.length) return;
    setCurrentStep((current) => (current + 1) % images.length);
  };

  const prevSlide = () => {
    if (!images.length) return;
    setCurrentStep((current) => (current - 1 + images.length) % images.length);
  };

  const iconStyle = { fontSize: '4rem' };
  const disableArrows = images.length <= 1;

  return (
    <div className={styles.slideContainer}>
      <div
        className={styles.imageContainer}
        role="region"
        aria-label="Slide images"
      >
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Slide ${index + 1}`}
            className={`${styles.slideImage} ${index === currentStep ? styles.active : ''}`}
          />
        ))}
        <button
          className={`${styles.arrow} ${styles.left}`}
          onClick={prevSlide}
          aria-label="Previous slide"
          aria-disabled={disableArrows}
          disabled={disableArrows}
          type="button"
        >
          <ChevronLeftIcon style={iconStyle} />
        </button>
        <button
          className={`${styles.arrow} ${styles.right}`}
          onClick={nextSlide}
          aria-label="Next slide"
          aria-disabled={disableArrows}
          disabled={disableArrows}
          type="button"
        >
          <ChevronRightIcon style={iconStyle} />
        </button>
      </div>

      <div className={styles.slideTextContainer}>
        <p
          className={styles.slideText}
          role="status"
          aria-label="Slide text"
        >
          {steps[currentStep]}
        </p>
      </div>

      <div
        className={styles.controls}
        role="group"
        aria-label="Slide controls"
      >
        {images.map((_, index) => (
          <button
            key={index}
            className={`${styles.controlButton} ${index === currentStep ? styles.activeControl : ''}`}
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
