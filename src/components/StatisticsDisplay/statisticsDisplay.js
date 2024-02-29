import React from 'react';
import ContinuousChart from '../ContinuousChart/continuousChart';
import CategoricalChart from '../CategoricalChart/categoricalChart';
import DateChart from '../DateChart/dateChart';
import EntrySearch from '../EntrySearch/entrySearch';
import StatisticsDisplayStyles from './statisticsDisplay.module.css';

function StatisticsDisplay({ data, showOutliers, onGraphClick, selectedChart }) {

    console.log(data)
    const getMissingEntriesChartText = (count, missingValuesCount) => {
        if (missingValuesCount === 0) {
            return 'No missing entries';
        }
        const missingPercentage = (missingValuesCount / count * 100).toFixed(2);
        return `Missing Entries: ${missingValuesCount} (${missingPercentage}%)`;
    };

    let continuousDataForTable = {
        Name: data.continuousFeatures.map(feature => feature.featureName),
        'Count': data.continuousFeatures.map(feature => feature.count.toString()),
        'Mean': data.continuousFeatures.map(feature => feature.typeStatistics.Mean.toFixed(2)),
        'Std. Dev.': data.continuousFeatures.map(feature => feature.typeStatistics.StdDev.toFixed(2)),
        'Min': data.continuousFeatures.map(feature => feature.typeStatistics.Min.toString()),
        '1st Qrt.': data.continuousFeatures.map(feature => feature.typeStatistics.Qrt1.toFixed(2)),
        'Median': data.continuousFeatures.map(feature => feature.typeStatistics.Median.toFixed(2)),
        '3rd Qrt.': data.continuousFeatures.map(feature => feature.typeStatistics.Qrt3.toFixed(2)),
        'Max': data.continuousFeatures.map(feature => feature.typeStatistics.Max.toString()),
        'Missing Entries': data.continuousFeatures.map(feature => getMissingEntriesChartText(feature.count, feature.missingValuesCount)),
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
        'Missing Entries': data.categoricalFeatures.map(feature => getMissingEntriesChartText(feature.count, feature.missingValuesCount)),
    }

    if (data.dateStatistics) {
        Object.keys(data.dateStatistics).forEach(key => {
            const dateStat = data.dateStatistics[key];
            continuousDataForTable.Name.push(key + ' Date');
            continuousDataForTable.Count.push(dateStat.count.toString());
            continuousDataForTable.Mean.push(dateStat.mean ? dateStat.mean : 'N/A');
            continuousDataForTable['Std. Dev.'].push(dateStat.stdDev ? dateStat.stdDev.toFixed(2) : 'N/A'); // Also ensure it's toFixed(2) for consistency
            continuousDataForTable.Min.push(dateStat.earliestDate || 'N/A');
            continuousDataForTable['1st Qrt.'].push(dateStat.q1 || 'N/A');
            continuousDataForTable.Median.push(dateStat.median || 'N/A');
            continuousDataForTable['3rd Qrt.'].push(dateStat.q3 || 'N/A');
            continuousDataForTable.Max.push(dateStat.latestDate || 'N/A');
            continuousDataForTable['Missing Entries'].push(getMissingEntriesChartText(dateStat.count, dateStat.missingValuesCount));
        });
    }

    return (
        <div className={StatisticsDisplayStyles.chartFlexContainer}>
            <div className={StatisticsDisplayStyles.tablesContainer}>
                <div className={StatisticsDisplayStyles.entrySearchWrapper}>
                    <EntrySearch resultData={continuousDataForTable} />
                </div>
                <div className={StatisticsDisplayStyles.entrySearchWrapper}>
                    <EntrySearch resultData={categoricalDataForTable} />
                </div>
            </div>
            {data.continuousFeatures?.map((feature, index) => (
                <ContinuousChart
                    key={`continuous-${index}`}
                    feature={feature}
                    showOutliers={showOutliers}
                    missingEntriesText={getMissingEntriesChartText(feature.count, feature.missingValuesCount)}
                    onClick={() => onGraphClick({ type: 'continuous', featureName: feature.featureName })}
                    isSelected={selectedChart?.type === 'continuous' && selectedChart?.featureName === feature.featureName}
                />
            ))}
            {data.categoricalFeatures?.map((feature, index) => (
                <CategoricalChart
                    key={`categorical-${index}`}
                    feature={feature}
                    missingEntriesText={getMissingEntriesChartText(feature.count, feature.missingValuesCount)}
                    onClick={() => onGraphClick({ type: 'categorical', featureName: feature.featureName })}
                    isSelected={selectedChart?.type === 'categorical' && selectedChart?.featureName === feature.featureName}
                />
            ))}
            {data.dateStatistics && Object.keys(data.dateStatistics).map((key, index) => (
                <DateChart
                    key={`date-${index}`}
                    dateData={data.dateStatistics[key]}
                    dateDataKey={key}
                    showOutliers={showOutliers}
                    missingEntriesText={getMissingEntriesChartText(data.dateStatistics[key].count, data.dateStatistics[key].missingValuesCount)}
                    onClick={() => onGraphClick({ type: 'date', key: key })}
                    isSelected={selectedChart?.type === 'date' && selectedChart?.key === key}
                />
            ))}
        </div>
    );
}

export default StatisticsDisplay;
