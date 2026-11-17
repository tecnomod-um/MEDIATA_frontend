import { featureArrays, sourceKey } from "./combinedStatistics";

export function poolingContributions(group, sources) {
  return group.members.map(member => {
    const source = sources.get(sourceKey(member));
    const feature = source?.[featureArrays[group.type]]?.find(item => item.featureName === member.column);
    const empty = !feature && source?.message?.startsWith("No records match");
    const omitted = source?.omittedFeatures?.find(item => item.featureName === member.column);
    const withheld = group.type !== "date" && !empty && !feature && (source?.disclosureWithheld
      || omitted?.reason?.startsWith("Suppressed for privacy:")
      || omitted?.reason?.startsWith("Statistics withheld by disclosure controls"));
    return { member, source, feature, empty, withheld };
  });
}
