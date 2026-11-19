import axios from "../../../util/axiosSetup";
import nodeAxios, {getResolvedNodeBaseURL} from "../../../util/nodeAxiosSetup";
import {sourceKey} from "./combinedStatistics";
import {protectedPoolingMembers} from "./approximatePooling";

export function securePoolingGroups(groups,sources) {
  return groups.filter(group=>new Set(group.members.map(member=>String(member.nodeId))).size>=2
    && protectedPoolingMembers([group],sources).size>0);
}

const completeRound=async operations=>{
  const settled=await Promise.allSettled(operations);
  const failure=settled.find(result=>result.status==="rejected");
  if(failure)throw failure.reason;
  return settled.map(result=>result.value);
};

const nodeRequest=(node,path,body,signal)=>nodeAxios.post(`/taniwha/api/data/securePool/${path}`,body,
  {baseURL:getResolvedNodeBaseURL(node.serviceUrl),signal}).then(response=>response.data);

// The browser relays only metadata, signed key offers and opaque masked vectors.
// All masks, private histograms, signature checks and finalization are node-side.
export async function loadSecurePooling(groups,nodes,filtersFor,signal) {
  const ids=[...new Set(groups.flatMap(group=>group.members.map(member=>String(member.nodeId))))].sort();
  const participants=(await axios.post("/nodes/secure-pool/participants",ids,{signal})).data;
  const selected=ids.map(id=>{
    const node=nodes.find(item=>String(item.nodeId)===id);
    if(!node?.serviceUrl) throw new Error("A secure pooling participant is unavailable.");
    return node;
  });
  const sources=[...new Map(groups.flatMap(group=>group.members).map(member=>[sourceKey(member),
    {nodeId:String(member.nodeId),fileName:member.fileName,filters:filtersFor(member)}])).values()];
  const features=groups.map((group,index)=>({id:`f${index}`,type:group.type,members:group.members.map(member=>
    ({nodeId:String(member.nodeId),fileName:member.fileName,column:member.column}))}));
  const manifest={sessionId:crypto.randomUUID(),createdAt:Date.now(),participants,sources,features};
  const serialized=JSON.stringify(manifest);
  try {
    const offers=await completeRound(selected.map(node=>nodeRequest(node,"prepare",{manifest:serialized,nodeId:String(node.nodeId)},signal)));
    const contributions=await completeRound(selected.map(node=>nodeRequest(node,"mask",{sessionId:manifest.sessionId,offers},signal)));
    const result=await nodeRequest(selected[0],"finish",{sessionId:manifest.sessionId,offers,contributions},signal);
    if(result.protocol!=="pairwise-masked-v1" || !result.features || !Number.isFinite(result.rowEpsilon))
      throw new Error("The node returned an unsupported secure pooling result.");
    return new Map(groups.map((group,index)=>[group.id,{result,wireId:features[index].id,
      cohort:JSON.stringify(group.members.map(sourceKey).sort()),groups,features}]));
  } finally {
    // Cleanup also runs after cancellation, without reusing an aborted signal.
    await Promise.allSettled(selected.map(node=>nodeAxios.delete(`/taniwha/api/data/securePool/${manifest.sessionId}`,
      {baseURL:getResolvedNodeBaseURL(node.serviceUrl),timeout:10000})));
  }
}

export function securePoolingFailure(error) {
  if(error?.response?.status===404) return "Secure pooling requires the updated orchestrator and all participating nodes.";
  return error?.response?.data?.detail || error?.message || "Secure pooled statistics could not be calculated.";
}
