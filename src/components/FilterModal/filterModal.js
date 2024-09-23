import React, { useState, useEffect, useRef } from 'react';
import OverlayWrapper from '../OverlayWrapper/overlayWrapper';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import FilterModalStyles from './filterModal.module.css';
import TooltipPopup from '../TooltipPopup/tooltipPopup';
import { IoMdClose } from 'react-icons/io';
import { filterData } from '../../util/petitionHandler';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

// Helper function to initialize filters based on data statistics
const initializeFilters = (dataStatistics) => {
    const filters = {};
    const allFeatures = [
        ...dataStatistics.categoricalFeatures,
        ...dataStatistics.continuousFeatures,
        ...dataStatistics.dateFeatures
    ];
    allFeatures.forEach(feature => {
        filters[feature.featureName] = null;
    });
    return filters;
};

const FilterModal = ({ isOpen, dataStatistics, closeModal, setFilters, setFilteredDataStatistics, inputFile }) => {
    const [filterConditions, setFilterConditions] = useState({});
    const [logicalOperators, setLogicalOperators] = useState({});
    const [globalLogicalOperator, setGlobalLogicalOperator] = useState('AND');
    const [selectedFeature, setSelectedFeature] = useState('');
    const [dateFilterType, setDateFilterType] = useState('equal');
    const [dateValue, setDateValue] = useState(new Date());
    const [dateRange, setDateRange] = useState([new Date(), new Date()]);
    const [continuousFilterType, setContinuousFilterType] = useState('equal');
    const [minValue, setMinValue] = useState('');
    const [maxValue, setMaxValue] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const applyButtonRef = useRef(null);
    const addButtonRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (dataStatistics) setFilterConditions(initializeFilters(dataStatistics));
    }, [dataStatistics]);

    const getGridTemplate = (selectedFeature, continuousFilterType, dateFilterType) => {
        if (dataStatistics.categoricalFeatures.some(feature => feature.featureName === selectedFeature))
            return '3fr 1fr'
        else if (continuousFilterType === 'between' || dateFilterType === 'between')
            return '1fr 1fr 1fr 1fr'
        else
            return '1fr 2fr 1fr'
    }

    const handleApplyFilters = () => {
        const filtersWithOperators = {};
        for (let feature in filterConditions) {
            if (filterConditions[feature]) {
                filtersWithOperators[feature] = {
                    conditions: filterConditions[feature],
                    operators: logicalOperators[feature] || []
                };
            }
        }

        const filters = {
            conditions: filtersWithOperators,
            operator: globalLogicalOperator
        };

        filterData(inputFile, filters)
            .then(data => {
                setFilters(filters);
                setFilteredDataStatistics(data);
                resetForm();
                closeModal();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    const handleAddFilter = () => {
        if (selectedFeature) {
            let newCondition = null;
            if (dataStatistics.categoricalFeatures.some(feature => feature.featureName === selectedFeature)) {
                const newConditions = selectedCategories.map(category => ({ type: 'equal', value: category, filterType: 'categorical' }));

                const newFilterConditions = { ...filterConditions };
                const newLogicalOperators = { ...logicalOperators };

                if (!newFilterConditions[selectedFeature]) {
                    newFilterConditions[selectedFeature] = [];
                    newLogicalOperators[selectedFeature] = [];
                }

                const existingLength = newFilterConditions[selectedFeature].length;
                newFilterConditions[selectedFeature] = [
                    ...newFilterConditions[selectedFeature],
                    ...newConditions,
                ];

                if (existingLength > 0) {
                    newLogicalOperators[selectedFeature] = [
                        ...newLogicalOperators[selectedFeature],
                        ...new Array(newConditions.length).fill('AND'),
                    ];
                } else if (newConditions.length > 1) {
                    newLogicalOperators[selectedFeature] = [
                        ...newLogicalOperators[selectedFeature],
                        ...new Array(newConditions.length - 1).fill('AND'),
                    ];
                }

                setFilterConditions(newFilterConditions);
                setLogicalOperators(newLogicalOperators);
                setSelectedCategories([]);
            } else if (dataStatistics.continuousFeatures.some(feature => feature.featureName === selectedFeature)) {
                newCondition = {
                    type: continuousFilterType,
                    value: continuousFilterType === 'between' ? [minValue, maxValue] : minValue,
                    filterType: 'continuous'
                };
            } else if (dataStatistics.dateFeatures.some(feature => feature.featureName === selectedFeature)) {
                newCondition = {
                    type: dateFilterType,
                    value: dateFilterType === 'between' ? [dateRange[0].toISOString(), dateRange[1].toISOString()] : dateValue.toISOString(),
                    filterType: 'date'
                };
            }

            if (newCondition) {
                const newFilterConditions = { ...filterConditions };
                const newLogicalOperators = { ...logicalOperators };

                if (!newFilterConditions[selectedFeature]) {
                    newFilterConditions[selectedFeature] = [];
                    newLogicalOperators[selectedFeature] = [];
                }

                newFilterConditions[selectedFeature].push(newCondition);
                if (newFilterConditions[selectedFeature].length > 1)
                    newLogicalOperators[selectedFeature].push('OR');

                setFilterConditions(newFilterConditions);
                setLogicalOperators(newLogicalOperators);
                setShowTooltip(false);
            } else {
                setShowTooltip(true);
            }
        } else {
            setShowTooltip(true);
        }
    }

    const getCategoryOptions = (featureName) => {
        const feature = dataStatistics.categoricalFeatures.find(f => f.featureName === featureName);
        if (!feature) return [];

        const selectedCategories = filterConditions[featureName] ? filterConditions[featureName].map(condition => condition.value) : [];
        return Object.keys(feature.categoryCounts)
            .filter(category => !selectedCategories.includes(category))
            .map(key => ({ value: key, label: key }));
    }

    const formatSingleCriteria = (condition, featureName) => {
        if (Array.isArray(condition))
            return condition.map(item => (<span key={item} className={FilterModalStyles.criteriaBox}>{item}</span>));

        const isDateFeature = dataStatistics.dateFeatures.some(feature => feature.featureName === featureName);
        const value = condition.value;
        const type = condition.type;

        let formattedValue;
        let formattedRange;
        if (isDateFeature) {
            formattedValue = Array.isArray(value) ? value.map(date => new Date(date).toLocaleDateString()) : new Date(value).toLocaleDateString();
            formattedRange = Array.isArray(value) ? value.map(date => new Date(date).toLocaleDateString()) : [condition.min, condition.max];
        } else {
            formattedValue = value;
            formattedRange = Array.isArray(value) ? value : [condition.min, condition.max];
        }

        switch (type) {
            case 'between':
                return <>Between <span className={FilterModalStyles.criteriaBox}>{formattedRange[0]}</span> and <span className={FilterModalStyles.criteriaBox}>{formattedRange[1]}</span></>;
            case 'greater':
                return isDateFeature ? <>Later than <span className={FilterModalStyles.criteriaBox}>{formattedValue}</span></> : <>Greater than <span className={FilterModalStyles.criteriaBox}>{formattedValue}</span></>;
            case 'less':
                return isDateFeature ? <>Sooner than <span className={FilterModalStyles.criteriaBox}>{formattedValue}</span></> : <>Less than <span className={FilterModalStyles.criteriaBox}>{formattedValue}</span></>;
            case 'equal':
                return isDateFeature ? <>Equal to <span className={FilterModalStyles.criteriaBox}>{formattedValue}</span></> : <>Equal to <span className={FilterModalStyles.criteriaBox}>{formattedValue}</span></>;
            default:
                return condition;
        }
    }



    const handleDeleteFilter = (feature, index) => {
        const newFilterConditions = { ...filterConditions };
        const newLogicalOperators = { ...logicalOperators };

        newFilterConditions[feature].splice(index, 1);
        if (newFilterConditions[feature].length === 0) {
            delete newFilterConditions[feature]
            delete newLogicalOperators[feature]
        } else {
            newLogicalOperators[feature].splice(index, 1);
        }

        setFilterConditions(newFilterConditions);
        setLogicalOperators(newLogicalOperators);
    }

    const formatCriteria = (criteria, featureName, logicalOps) => {
        return criteria.map((condition, index) => (
            <div key={index} className={FilterModalStyles.criteriaContainer}>
                {index > 0 && (
                    <button
                        className={FilterModalStyles.logicalOperatorButton}
                        onClick={() => toggleLogicalOperator(featureName, index - 1)}
                    >
                        {logicalOps[index - 1]}
                    </button>
                )}
                {formatSingleCriteria(condition, featureName)}
                <button
                    className={FilterModalStyles.deleteButton}
                    onClick={() => handleDeleteFilter(featureName, index)}
                >
                    <IoMdClose />
                </button>
            </div>
        ));
    }

    const toggleLogicalOperator = (featureName, index) => {
        const newLogicalOperators = { ...logicalOperators };
        newLogicalOperators[featureName][index] =
            newLogicalOperators[featureName][index] === 'AND' ? 'OR' : 'AND';
        setLogicalOperators(newLogicalOperators);
    }

    const resetForm = () => {
        setSelectedFeature('');
        setSelectedCategories([]);
        setDateFilterType('equal');
        setDateValue(new Date());
        setDateRange([new Date(), new Date()]);
        setContinuousFilterType('equal');
        setMinValue('');
        setMaxValue('');
    }


    const getOptions = (dataStatistics) => {
        console.log(dataStatistics)
        const options = [];

        if (dataStatistics.categoricalFeatures) dataStatistics.categoricalFeatures.forEach(feature => {
            options.push({
                value: feature.featureName,
                label: feature.featureName
            });
        });

        if (dataStatistics.continuousFeatures) dataStatistics.continuousFeatures.forEach(feature => {
            options.push({
                value: feature.featureName,
                label: feature.featureName
            });
        });

        if (dataStatistics.dateFeatures) dataStatistics.dateFeatures.forEach(feature => {
            options.push({
                value: feature.featureName,
                label: feature.featureName
            });
        });

        return options;
    }

    // Function to check for at least two non-null filters
    const hasAtLeastTwoFilters = () => {
        return Object.values(filterConditions).filter(value => value !== null && value.length > 0).length > 1;
    };

    const isAddFilterDisabled = () => {
        if (!selectedFeature) return true;
        if (dataStatistics.categoricalFeatures.some(feature => feature.featureName === selectedFeature))
            return selectedCategories.length === 0;
        else if (dataStatistics.continuousFeatures.some(feature => feature.featureName === selectedFeature))
            return continuousFilterType === 'between' ? !minValue || !maxValue : !minValue;
        else if (dataStatistics.dateFeatures.some(feature => feature.featureName === selectedFeature))
            return dateFilterType === 'between' ? !dateRange[0] || !dateRange[1] : !dateValue;

        return false;
    }

    if (!dataStatistics) return null

    return (
        <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
            <div className={FilterModalStyles.filterModal}>
                <div className={FilterModalStyles.modalHeader}>
                    <h3>Filter displayed data</h3>
                    <button className={FilterModalStyles.closeBtn} onClick={closeModal} aria-label="Close">
                        <IoMdClose />
                    </button>
                </div>
                <div className={selectedFeature ? FilterModalStyles.formRow : FilterModalStyles.centeredRow}>
                    <div className={FilterModalStyles.featureSelection}>
                        <Select
                            options={getOptions(dataStatistics)}
                            onChange={(option) => setSelectedFeature(option.value)}
                            value={getOptions(dataStatistics).find(option => option.value === selectedFeature)}
                        />
                        {hasAtLeastTwoFilters() && (
                            <div className={FilterModalStyles.globalLogicalOperatorContainer}>
                                <label>Combine all filters with</label>
                                <button
                                    className={FilterModalStyles.logicalOperatorButton}
                                    onClick={() => setGlobalLogicalOperator(globalLogicalOperator === 'AND' ? 'OR' : 'AND')}
                                >
                                    {globalLogicalOperator}
                                </button>
                            </div>
                        )}
                    </div>
                    {selectedFeature && (
                        <div className={FilterModalStyles.filterCriteria} style={{ gridTemplateColumns: getGridTemplate(selectedFeature, continuousFilterType, dateFilterType) }}>
                            {dataStatistics.categoricalFeatures.some(feature => feature.featureName === selectedFeature) && (
                                <div>
                                    <label>Only rows with the chosen categories will be shown</label>
                                    <Select
                                        isMulti
                                        options={getCategoryOptions(selectedFeature)}
                                        onChange={selected => setSelectedCategories(selected.map(option => option.value))}
                                        value={getCategoryOptions(selectedFeature).filter(option => selectedCategories.includes(option.value))}
                                    />
                                </div>
                            )}
                            {dataStatistics.continuousFeatures.some(feature => feature.featureName === selectedFeature) && (
                                <>
                                    <div>
                                        <label>Filter Type</label>
                                        <select className={FilterModalStyles.select} onChange={(e) => setContinuousFilterType(e.target.value)} value={continuousFilterType}>
                                            <option value="equal">Equal</option>
                                            <option value="between">Between</option>
                                            <option value="less">Less than</option>
                                            <option value="greater">Greater than</option>
                                        </select>
                                    </div>
                                    {continuousFilterType === 'between' ? (
                                        <>
                                            <div>
                                                <label>Min Value</label>
                                                <input
                                                    type="number"
                                                    className={FilterModalStyles.input}
                                                    onChange={(e) => setMinValue(e.target.value)}
                                                    value={minValue}
                                                />
                                            </div>
                                            <div>
                                                <label>Max Value</label>
                                                <input
                                                    type="number"
                                                    className={FilterModalStyles.input}
                                                    onChange={(e) => setMaxValue(e.target.value)}
                                                    value={maxValue}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <label>Value</label>
                                            <input
                                                type="number"
                                                className={FilterModalStyles.input}
                                                onChange={(e) => setMinValue(e.target.value)}
                                                value={minValue}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            {dataStatistics.dateFeatures.some(feature => feature.featureName === selectedFeature) && (
                                <>
                                    <div>
                                        <label>Filter Type</label>
                                        <select className={FilterModalStyles.select} onChange={(e) => setDateFilterType(e.target.value)} value={dateFilterType}>
                                            <option value="equal">Equal</option>
                                            <option value="between">Between</option>
                                            <option value="less">Sooner than</option>
                                            <option value="greater">Later than</option>
                                        </select>
                                    </div>
                                    {dateFilterType === 'between' ? (
                                        <>
                                            <div>
                                                <label>Start Date</label>
                                                <DatePicker selected={dateRange[0]} onChange={date => setDateRange([date, dateRange[1]])} className={FilterModalStyles.datePicker} />
                                            </div>
                                            <div>
                                                <label>End Date</label>
                                                <DatePicker selected={dateRange[1]} onChange={date => setDateRange([dateRange[0], date])} className={FilterModalStyles.datePicker} />
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <label>Date</label>
                                            <DatePicker selected={dateValue} onChange={date => setDateValue(date)} className={FilterModalStyles.datePicker} />
                                        </div>
                                    )}
                                </>
                            )}
                            <button
                                className={FilterModalStyles.addButton}
                                onClick={() => {
                                    if (isAddFilterDisabled()) {
                                        setShowTooltip(true);
                                    } else {
                                        handleAddFilter();
                                    }
                                }}
                                ref={addButtonRef}
                            >
                                {filterConditions[selectedFeature] && filterConditions[selectedFeature].length > 0 ? 'Add More Criteria' : 'Add Filter'}
                            </button>
                            {showTooltip &&
                                <TooltipPopup message={"Please fill in all fields"} buttonRef={addButtonRef} onClose={() => setShowTooltip(false)} />}
                        </div>
                    )}
                </div>
                {Object.keys(filterConditions).some(key => filterConditions[key]) && (
                    <div className={FilterModalStyles.filterSummary}>
                        <TransitionGroup component="ul">
                            {Object.entries(filterConditions).map(([feature, criteria], featureIndex) => criteria && (
                                <CSSTransition
                                    key={feature}
                                    timeout={500}
                                    classNames={{
                                        enter: FilterModalStyles.itemEnter,
                                        enterActive: FilterModalStyles.itemEnterActive,
                                        exit: FilterModalStyles.itemExit,
                                        exitActive: FilterModalStyles.itemExitActive
                                    }}
                                >
                                    <li style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className={FilterModalStyles.filterSummaryTitle}>
                                            <strong>{feature}:</strong>
                                        </div>
                                        <div className={FilterModalStyles.criteriaRow}>
                                            {formatCriteria(criteria, feature, logicalOperators[feature])}
                                        </div>
                                    </li>
                                </CSSTransition>
                            ))}
                        </TransitionGroup>
                    </div>
                )}
                <div className={FilterModalStyles.buttonRow}>
                    <button className={FilterModalStyles.cancelButton} onClick={closeModal}>Cancel</button>
                    <button
                        className={FilterModalStyles.applyButton}
                        onClick={handleApplyFilters}
                        ref={applyButtonRef}
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </OverlayWrapper>
    );
}

export default FilterModal;
