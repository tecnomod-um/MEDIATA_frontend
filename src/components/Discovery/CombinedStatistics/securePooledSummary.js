import {sourceKey} from "./combinedStatistics";
import {addProtectedDistribution,buildApproximateSummary} from "./approximatePooling";

export function securePooledSummary(group,exact,entry) {
  const unavailable=reason=>exact.unavailable ? {...exact,unavailable:reason}
    : {...exact,note:[exact.note,`Secure distribution unavailable: ${reason}`].filter(Boolean).join(" ")};
  if(entry?.unavailable) return unavailable(entry.unavailable);
  if(!entry) return exact;
  const {result,wireId,cohort,groups,features}=entry;
  const reason=result.unavailable?.[wireId];
  if(reason || !result.features[wireId]) return unavailable(reason || "A participant could not contribute this feature.");
  // Shared count reconstruction is valid only for features from the same
  // source cohort. A two-site item must not borrow the three-site Age total.
  const sameCohort=groups.map((item,index)=>({item,id:features[index].id}))
    .filter(({item})=>JSON.stringify(item.members.map(sourceKey).sort())===cohort);
  const release={version:4,group:result.manifestHash,selectionScope:"secure-pool",rowEpsilon:result.rowEpsilon,postprocessing:"supported-frequencies",
    features:Object.fromEntries(sameCohort.filter(({id})=>result.features[id]).map(({id})=>[id,result.features[id]]))};
  const member={nodeId:"secure-pool",fileName:cohort,column:wireId};
  const target={label:group.label,type:group.type,members:[member]};
  const releases=new Map([[sourceKey(member),release]]);
  let summary=exact.unavailable ? buildApproximateSummary(target,releases) : exact;
  summary=addProtectedDistribution(target,[{member,withheld:true}],releases,summary);
  if(summary===exact) return exact;
  return {...summary,includedSources:group.members.length,totalSources:group.members.length,
    contributions:exact.contributions,
    note:[summary.note,"Secure aggregation: nodes mask their independent cached protected contributions; only the combined histogram is released. The secure-path cost is additional to site-level releases and conditional on published metadata. Selected rows are pooled without patient deduplication.",
      group.type==="categorical" ? "Numerical point domains interpreted as categories use normalized score labels; original text formatting is not retained." : null].filter(Boolean).join(" ")};
}
