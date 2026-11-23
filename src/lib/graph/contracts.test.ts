import {describe,expect,it} from "vitest";
import {validateGraphDocument} from "./contracts";
import {applyStudioAutoLayout,computeStudioAutoLayout} from "@/lib/studio/auto-layout";
import type {GraphDocument} from "./contracts";
const graph:GraphDocument={id:"g1",websiteId:"w1",revision:1,nodes:[
{id:"site",type:"website",lifecycleStatus:"active",properties:{name:"Site"}},
{id:"home",type:"page",lifecycleStatus:"active",properties:{path:"/"}},
{id:"hero",type:"section",lifecycleStatus:"active",properties:{title:"Hero"}},
{id:"archived",type:"page",lifecycleStatus:"archived",properties:{}},
],edges:[
{id:"e1",type:"contains_page",sourceNodeId:"site",targetNodeId:"home"},
{id:"e2",type:"contains_section",sourceNodeId:"home",targetNodeId:"hero"},
]};
describe("Graph Engine contracts",()=>{
it("validates unique node and edge identities and existing endpoints",()=>{
expect(validateGraphDocument(graph)).toBe(true);
expect(validateGraphDocument({...graph,nodes:[...graph.nodes,graph.nodes[0]]})).toBe(false);
expect(validateGraphDocument({...graph,edges:[...graph.edges,{id:"bad",type:"contains_page",sourceNodeId:"site",targetNodeId:"missing"}]})).toBe(false);
});
it("computes stable layered positions for active graph nodes only",()=>{
const first=computeStudioAutoLayout(graph),second=computeStudioAutoLayout(graph);
expect(first.ok).toBe(true);expect(first.positions).toEqual(second.positions);
expect(first.positions.map(p=>p.nodeId).sort()).toEqual(["hero","home","site"]);
expect(first.positions.find(p=>p.nodeId==="site")?.x).toBeLessThan(first.positions.find(p=>p.nodeId==="home")!.x);
});
it("preserves locked user positions and rejects malformed saved positions",()=>{
const result=applyStudioAutoLayout(graph,[{nodeId:"home",x:900,y:700,locked:true}]);
expect(result.positions.find(p=>p.nodeId==="home")).toEqual({nodeId:"home",x:900,y:700,locked:true});
expect(applyStudioAutoLayout(graph,[{nodeId:"home",x:NaN,y:0,locked:false}]).ok).toBe(false);
});
it("rejects cyclic or multiply-parented containment instead of silently laying out",()=>{
const cycle={...graph,edges:[...graph.edges,{id:"e3",type:"contains_section" as const,sourceNodeId:"hero",targetNodeId:"home"}]};
expect(computeStudioAutoLayout(cycle).ok).toBe(false);
const multiple={...graph,edges:[...graph.edges,{id:"e3",type:"contains_page" as const,sourceNodeId:"hero",targetNodeId:"home"}]};
expect(computeStudioAutoLayout(multiple).ok).toBe(false);
});
});
