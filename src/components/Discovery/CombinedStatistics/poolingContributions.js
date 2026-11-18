import { featureArrays, sourceKey } from "./combinedStatistics";
import { numericalDateFeature } from "./protectedDateSummary";

export function needsProtectedMoments(part, type) {
  return part.withheld || (type === "date" && part.feature && !numericalDateFeature(part.feature));
}

export function needsProtectedMode(feature) {
  return feature?.count > 0 && !feature.modes?.length && typeof feature.modeStatus === "string"
    && feature.modeStatus !== "No repeated value" && feature.modeStatus !== "Available";
}

export function poolingContributions(group, sources) {
  return group.members.map(member => {
    const source = sources.get(sourceKey(member));
    const feature = source?.[featureArrays[group.type]]?.find(item => item.featureName === member.column);
    const empty = !feature && source?.message?.startsWith("No records match");
    const omitted = source?.omittedFeatures?.find(item => item.featureName === member.column);
    const withheld = !empty && !feature && (source?.disclosureWithheld
      || omitted?.reason?.startsWith("Suppressed for privacy:")
      || omitted?.reason?.startsWith("Statistics withheld by disclosure controls"));
    return { member, source, feature, empty, withheld };
  });
}
