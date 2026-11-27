// Missing numerical results carry a reason in CSV/Excel instead of an empty
// cell. These labels never turn undefined statistics into invented numbers.
export function statisticValue(summary, field, value) {
  if(summary.unavailable && !(summary.countsReleased && ["count", "missing", "percentMissing"].includes(field))) return "Unavailable";
  if(value != null && (typeof value!=="number" || Number.isFinite(value))) return value;
  if(field==="supportedMin" || field==="supportedMax") return summary.approximate ? "Not established" : "Not applicable";
  if(summary.count===0) return "Undefined: no non-missing observations";
  if(summary.categoryCountsStatus === "COARSENED"
    && ["mode", "modeFrequency", "modeFrequencyPercentage", "secondMode", "secondModeFrequency", "secondModePercentage"].includes(field)) return "Withheld";
  const required={sampleStdDev:2,skewness:3,kurtosis:4,meanCiLower:2,meanCiUpper:2};
  if(required[field] && summary.count<required[field]) return `Undefined: fewer than ${required[field]} observations`;
  if((field==="skewness" || field==="kurtosis") && (summary.stdDev===0 || summary.sampleStdDev===0)) return "Undefined: constant feature";
  if(["mode","modeFrequency","modePercent"].includes(field) && summary.modeStatus==="No repeated value") return "No repeated value";
  return summary.approximate ? "Not estimable from the protected release" : "Not released";
}
