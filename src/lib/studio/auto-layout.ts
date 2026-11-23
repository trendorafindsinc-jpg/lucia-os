import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";
export interface SavedStudioCanvasPosition { nodeId: string; x: number; y: number; locked: boolean }
export type StudioCanvasPosition = SavedStudioCanvasPosition;
export interface StudioAutoLayoutResult {
  ok: boolean;
  positions: StudioCanvasPosition[];
  diagnostics: { code: string; message: string; nodeId?: string }[];
}
const WIDTH = 232;
const HEIGHT = 104;
const X_GAP = 112;
const Y_GAP = 72;
const finitePosition = (p: SavedStudioCanvasPosition) =>
  Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 100_000 && Math.abs(p.y) <= 100_000;
function activeNodes(graph: GraphDocument): GraphNode[] {
  return graph.nodes.filter((node) => node.lifecycleStatus === "active");
}
/** Deterministic layered layout. Parent-child containment determines levels; unrelated nodes are grouped by type. */
export function computeStudioAutoLayout(graph: GraphDocument): StudioAutoLayoutResult {
  const nodes = activeNodes(graph).sort((a,b) => a.id.localeCompare(b.id));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => ids.has(edge.sourceNodeId) && ids.has(edge.targetNodeId) && edge.type.startsWith("contains_"));
  const parent = new Map<string,string>();
  for (const edge of edges) {
    if (parent.has(edge.targetNodeId)) return {ok:false,positions:[],diagnostics:[{code:"MULTIPLE_CONTAINMENT_PARENTS",message:"A node has more than one active containment parent.",nodeId:edge.targetNodeId}]};
    parent.set(edge.targetNodeId,edge.sourceNodeId);
  }
  const depth = new Map<string,number>();
  const visit = (id:string, stack:Set<string>):number => {
    const known=depth.get(id); if (known !== undefined) return known;
    if (stack.has(id)) throw new Error("Containment relationships contain a cycle.");
    const next=new Set(stack); next.add(id);
    const p=parent.get(id);
    const value=p ? visit(p,next)+1 : 0;
    depth.set(id,value); return value;
  };
  try { for (const node of nodes) visit(node.id,new Set()); }
  catch { return {ok:false,positions:[],diagnostics:[{code:"CONTAINMENT_CYCLE",message:"Containment relationships contain a cycle and cannot be laid out."}]}; }
  const buckets=new Map<number,GraphNode[]>();
  for (const node of nodes) { const level=depth.get(node.id) ?? 0; const bucket=buckets.get(level) ?? []; bucket.push(node); buckets.set(level,bucket); }
  const positions:StudioCanvasPosition[]=[];
  for (const [level,items] of [...buckets.entries()].sort((a,b)=>a[0]-b[0])) {
    items.sort((a,b)=>a.type.localeCompare(b.type)||a.id.localeCompare(b.id));
    items.forEach((node,index)=>positions.push({nodeId:node.id,x:64+level*(WIDTH+X_GAP),y:64+index*(HEIGHT+Y_GAP),locked:false}));
  }
  return {ok:true,positions,diagnostics:[]};
}
/** Re-layouts movable nodes only; locked saved positions remain unchanged. */
export function applyStudioAutoLayout(graph:GraphDocument,saved:readonly SavedStudioCanvasPosition[]):StudioAutoLayoutResult {
  const duplicate=new Set<string>();
  for(const p of saved) {
    if(!p.nodeId||duplicate.has(p.nodeId)||!finitePosition(p)) return {ok:false,positions:[],diagnostics:[{code:"INVALID_SAVED_POSITION",message:"Saved canvas positions contain duplicate IDs or invalid coordinates.",nodeId:p.nodeId}]};
    duplicate.add(p.nodeId);
  }
  const computed=computeStudioAutoLayout(graph);
  if(!computed.ok)return computed;
  const byId=new Map(saved.map((p)=>[p.nodeId,p]));
  const positions=computed.positions.map((p)=>{
    const prior=byId.get(p.nodeId);
    return prior?.locked ? {...prior} : p;
  });
  return {ok:true,positions,diagnostics:[]};
}
