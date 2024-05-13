import React from 'react';
import OverlayWrapper from './OverlayWrapper';

const ChartPreview = ({ isOpen, content, closeModal }) => {
    return (
        <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
            {content}
        </OverlayWrapper>
    );
}

export default ChartPreview;
