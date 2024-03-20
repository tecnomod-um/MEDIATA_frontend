import React from 'react';
import ContinuousChart from '../ContinuousChart/continuousChart';
import CategoricalChart from '../CategoricalChart/categoricalChart';
import DateChart from '../DateChart/dateChart';
import EntrySearch from '../EntrySearch/entrySearch';
import StatisticsDisplayStyles from './statisticsDisplay.module.css';

function StatisticsDisplay({ data, showOutliers, setSelectedEntry, selectedEntry }) {

    const getMissingEntriesChartText = (count, missingValuesCount) => {
        if (missingValuesCount === 0) {
            return 'No missing entries';
        }
        const missingPercentage = (missingValuesCount / count * 100).toFixed(2);
        return `Missing Entries: ${missingValuesCount} (${missingPercentage}%)`;
    };
    const formatMissingEntries = (count, missingValuesCount) => {
        const missingPercentage = (missingValuesCount / count * 100).toFixed(2);
        return missingValuesCount === 0 ? '0 (0%)' : `${missingValuesCount} (${missingPercentage}%)`;
    };

    let continuousDataForTable = {
        Name: data.continuousFeatures.map(feature => feature.featureName),
        'Count': data.continuousFeatures.map(feature => feature.count.toString()),
        'Mean': data.continuousFeatures.map(feature => feature.mean.toFixed(2)),
        'Std. Dev.': data.continuousFeatures.map(feature => feature.stdDev.toFixed(2)),
        'Min': data.continuousFeatures.map(feature => feature.min.toString()),
        '1st Qrt.': data.continuousFeatures.map(feature => feature.qrt1.toFixed(2)),
        'Median': data.continuousFeatures.map(feature => feature.median.toFixed(2)),
        '3rd Qrt.': data.continuousFeatures.map(feature => feature.qrt3.toFixed(2)),
        'Max': data.continuousFeatures.map(feature => feature.max.toString()),
        'Missing Entries': data.continuousFeatures.map(feature => formatMissingEntries(feature.count, feature.missingValuesCount)),
    }

    const categoricalDataForTable = {
        Name: data.categoricalFeatures.map(feature => feature.featureName),
        'Total Count': data.categoricalFeatures.map(feature => feature.count.toString()),
        'Mode': data.categoricalFeatures.map(feature => feature.mode || 'N/A'),
        'Mode Frequency': data.categoricalFeatures.map(feature => feature.modeFrequency ? feature.modeFrequency.toString() : 'N/A'),
        'Mode %': data.categoricalFeatures.map(feature => feature.modeFrequencyPercentage ? `${feature.modeFrequencyPercentage.toFixed(2)}%` : 'N/A'),
        '2nd Mode': data.categoricalFeatures.map(feature => feature.secondMode || 'N/A'),
        '2nd Mode Frequency': data.categoricalFeatures.map(feature => feature.secondModeFrequency ? feature.secondModeFrequency.toString() : 'N/A'),
        '2nd Mode %': data.categoricalFeatures.map(feature => feature.secondModePercentage ? `${feature.secondModePercentage.toFixed(2)}%` : 'N/A'),
        'Missing Entries': data.categoricalFeatures.map(feature => formatMissingEntries(feature.count, feature.missingValuesCount)),
    }

    if (data.dateFeatures && data.dateFeatures.length > 0) {
        data.dateFeatures.forEach(dateStat => {
            continuousDataForTable.Name.push(dateStat.featureName);
            continuousDataForTable['Count'].push(dateStat.count);
            continuousDataForTable['Mean'].push(dateStat.mean ? dateStat.mean : 'N/A');
            continuousDataForTable['Std. Dev.'].push(dateStat.stdDev ? dateStat.stdDev.toFixed(2) : 'N/A');
            continuousDataForTable['Min'].push(dateStat.earliestDate || 'N/A');
            continuousDataForTable['1st Qrt.'].push(dateStat.q1 || 'N/A');
            continuousDataForTable['Median'].push(dateStat.median || 'N/A');
            continuousDataForTable['3rd Qrt.'].push(dateStat.q3 || 'N/A');
            continuousDataForTable['Max'].push(dateStat.latestDate || 'N/A');
            continuousDataForTable['Missing Entries'].push(formatMissingEntries(dateStat.count, dateStat.missingValuesCount));
        });
    }

    return (
        <div className={StatisticsDisplayStyles.chartFlexContainer}>
            <div className={StatisticsDisplayStyles.tablesContainer}>
                <div className={StatisticsDisplayStyles.entrySearchWrapper}>
                    <EntrySearch resultData={continuousDataForTable} onRowSelect={setSelectedEntry} selectedEntry={selectedEntry} type="continuous" />
                </div>
                <div className={StatisticsDisplayStyles.entrySearchWrapper}>
                    <EntrySearch resultData={categoricalDataForTable} onRowSelect={setSelectedEntry} selectedEntry={selectedEntry} type="categorical" />
                </div>
            </div>
            {data.continuousFeatures?.map((feature, index) => (
                <ContinuousChart
                    key={`continuous-${index}`}
                    feature={feature}
                    showOutliers={showOutliers}
                    missingEntriesText={getMissingEntriesChartText(feature.count, feature.missingValuesCount)}
                    onClick={() => setSelectedEntry({ type: 'continuous', featureName: feature.featureName })}
                    isSelected={selectedEntry?.type === 'continuous' && selectedEntry?.featureName === feature.featureName}
                />
            ))}
            {data.categoricalFeatures?.map((feature, index) => (
                <CategoricalChart
                    key={`categorical-${index}`}
                    feature={feature}
                    missingEntriesText={getMissingEntriesChartText(feature.count, feature.missingValuesCount)}
                    onClick={() => setSelectedEntry({ type: 'categorical', featureName: feature.featureName })}
                    isSelected={selectedEntry?.type === 'categorical' && selectedEntry?.featureName === feature.featureName}
                />
            ))}
            {data.dateFeatures?.map((dateFeature, index) => (
                <DateChart
                    key={`date-${index}`}
                    dateData={dateFeature}
                    dateDataKey={dateFeature.featureName}
                    showOutliers={showOutliers}
                    missingEntriesText={getMissingEntriesChartText(dateFeature.count, dateFeature.missingValuesCount)}
                    onClick={() => setSelectedEntry({ type: 'continuous', featureName: dateFeature.featureName })}
                    isSelected={selectedEntry?.type === 'continuous' && selectedEntry?.featureName === dateFeature.featureName}
                />
            ))}
        </div>
    );
}

export default StatisticsDisplay;
