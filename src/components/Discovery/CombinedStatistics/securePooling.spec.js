import {beforeEach,expect,it,vi} from "vitest";
import {loadSecurePooling,securePoolingGroups} from "./securePooling";
import axios from "../../../util/axiosSetup";
import nodeAxios from "../../../util/nodeAxiosSetup";

vi.mock("../../../util/axiosSetup",()=>({default:{post:vi.fn()}}));
vi.mock("../../../util/nodeAxiosSetup",()=>({default:{post:vi.fn(),delete:vi.fn()},getResolvedNodeBaseURL:value=>value}));
const nodes=[1,2,3].map(nodeId=>({nodeId,serviceUrl:`https://site${nodeId}`}));
const members=nodes.map(node=>({nodeId:node.nodeId,fileName:"data.csv",column:"Reading"}));
const group={id:"reading",label:"Reading",type:"continuous",members};
beforeEach(()=>{
  vi.clearAllMocks();
  axios.post.mockResolvedValue({data:nodes.map(node=>({nodeId:String(node.nodeId),publicKey:"public"}))});
  nodeAxios.post.mockImplementation(async(path,body)=>({data:path.endsWith("finish")
    ?{protocol:"pairwise-masked-v1",manifestHash:"hash",features:{f0:{}},rowEpsilon:2}
    :{payload:JSON.stringify({opaque:true}),signature:"signed"}}));
  nodeAxios.delete.mockResolvedValue({});
});

it("relays offers and opaque vectors and asks a backend to finalize",async()=>{
  const result=await loadSecurePooling([group],nodes,()=>({conditions:{}}),new AbortController().signal);
  expect(result.has(group.id)).toBe(true);
  expect(axios.post).toHaveBeenCalledWith("/nodes/secure-pool/participants",["1","2","3"],expect.anything());
  expect(nodeAxios.post.mock.calls.filter(([path])=>path.endsWith("prepare"))).toHaveLength(3);
  expect(nodeAxios.post.mock.calls.filter(([path])=>path.endsWith("mask"))).toHaveLength(3);
  const finish=nodeAxios.post.mock.calls.find(([path])=>path.endsWith("finish"));
  expect(finish[1].contributions).toHaveLength(3);
  expect(nodeAxios.delete).toHaveBeenCalledTimes(3);
});

it("cleans up failures and does not finalize a dropped participant",async()=>{
  nodeAxios.post.mockRejectedValueOnce(new Error("Node unavailable"));
  await expect(loadSecurePooling([group],nodes,()=>null,new AbortController().signal)).rejects.toThrow("Node unavailable");
  expect(nodeAxios.post.mock.calls.some(([path])=>path.endsWith("finish"))).toBe(false);
  expect(nodeAxios.delete).toHaveBeenCalledTimes(3);
});

it("leaves fully released and single-node combinations on their existing path",()=>{
  const sources=members.map(source=>({...source,continuousFeatures:[{featureName:"Reading",count:10,mean:5,min:5,max:5,
    stdDev:0,missingValuesCount:0,valueCounts:[{value:5,count:10}]}]}));
  expect(securePoolingGroups([group],sources)).toEqual([]);
  const local={...group,members:members.map(member=>({...member,nodeId:1}))};
  expect(securePoolingGroups([local],sources)).toEqual([]);
});
