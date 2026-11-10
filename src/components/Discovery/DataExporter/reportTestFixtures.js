import { collectDiscoveryStatistics } from "../discoveryStatistics";
import { createColumnMappings } from "../CombinedStatistics/columnMappings";
import { combineMappedTableData } from "../CombinedStatistics/statisticsTableData";
import { combineMappedRelationships } from "../CombinedStatistics/pairedStatistics";

export function reportFixture() {
  const sources = [24, 36].map((count, index) => {
    const mean = index ? 80 : 20.123456789123;
    return { nodeId: index + 1, nodeName: "Hospital", fileName: "patients.csv", relationshipSummaryVersion: 1,
      continuousFeatures: ["Age", "Score"].map(featureName => ({ featureName, count, missingValuesCount: 0, mean,
        stdDev: 2, min: mean - 4, max: mean + 4, qrt1: mean - 2, median: mean, qrt3: mean + 2 })),
      categoricalFeatures: [{ featureName: "Group", count, missingValuesCount: 0, categoryCounts: { "0": count / 2, B: count / 2 } }],
      dateFeatures: [{ featureName: "VisitDate", count, missingValuesCount: 0, mean: "2020-01-02", stdDev: 1,
        earliestDate: "2020-01-01", latestDate: "2020-01-03", q1: "2020-01-01", median: "2020-01-02", q3: "2020-01-03",
        dateHistogram: { "2020-01-01": count / 2, "2020-01-03": count / 2 } }],
      numericPairSummaries: [{ featureX: "Age", featureY: "Score", count, meanX: mean, meanY: mean, m2X: count * 4, m2Y: count * 4, crossMoment: count * 2 }],
      covariances: { Age: { Score: 2 }, Score: { Age: 2 } }, pearsonCorrelations: { Age: { Score: .5 }, Score: { Age: .5 } },
    };
  });
  const sourceData = collectDiscoveryStatistics(sources, [true, true]);
  const data = combineMappedTableData(sourceData, sources, [true, true], createColumnMappings(sources));
  return { data, sourceData, sources, relationships: combineMappedRelationships(data, sources) };
}
