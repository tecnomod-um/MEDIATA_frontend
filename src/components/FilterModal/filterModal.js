import React from 'react';
import OverlayWrapper from '../OverlayWrapper/overlayWrapper';

const FilterModal = ({ isOpen, closeModal }) => {
    return (
        <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
            Test
        </OverlayWrapper>
    );
}

export default FilterModal;
