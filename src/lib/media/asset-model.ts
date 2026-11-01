import { z } from "zod";
export const mediaAssetCreateSchema=z.object({action:z.literal("create"),kind:z.enum(["video","document"]),mime:z.enum(["video/mp4","video/webm","application/pdf"]),filename:z.string().trim().min(1).max(255),bytes:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/),headerBase64:z.string().min(4).max(128),alt:z.string().trim().min(1).max(200),caption:z.string().trim().max(200).nullable().default(null),durationMs:z.number().int().positive().max(3600000).nullable().default(null)}).strict().superRefine((value,ctx)=>{
 if((value.kind==="video")!==value.mime.startsWith("video/"))ctx.addIssue({code:"custom",path:["mime"],message:"Media kind and MIME type do not match."});
 if(value.kind==="document"&&value.mime!=="application/pdf")ctx.addIssue({code:"custom",path:["mime"],message:"Only PDF documents are accepted in this release."});
 if(value.kind==="video"&&value.bytes>100_000_000)ctx.addIssue({code:"custom",path:["bytes"],message:"Videos are limited to 100 MB."});
 if(value.kind==="document"&&value.bytes>25_000_000)ctx.addIssue({code:"custom",path:["bytes"],message:"PDF documents are limited to 25 MB."});
});
export const mediaAssetCompleteSchema=z.object({action:z.literal("complete"),mediaId:z.uuid(),uploadId:z.string().min(8).max(512),parts:z.array(z.object({partNumber:z.number().int().min(1).max(10000),etag:z.string().min(16).max(128)}).strict()).min(1).max(10000)}).strict();
export const mediaAssetAbortSchema=z.object({action:z.literal("abort"),mediaId:z.uuid(),uploadId:z.string().min(8).max(512)}).strict();
export function mediaExtension(mime:string){return mime==="video/mp4"?"mp4":mime==="video/webm"?"webm":mime==="application/pdf"?"pdf":null;}
export function safeOriginalFilename(value:string){return value.normalize("NFKC").replace(/[\x00-\x1f\x7f/\\]/g,"_").replace(/\s+/g," ").trim().slice(0,255)||"customer-upload";}
export function validMediaMagic(kind:"video"|"document",mime:string,header:Buffer){
 if(kind==="document")return mime==="application/pdf"&&header.subarray(0,5).toString("ascii")==="%PDF-";
 if(mime==="video/mp4")return header.length>=12&&header.subarray(4,8).toString("ascii")==="ftyp";
 if(mime==="video/webm")return header.length>=4&&header.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 return false;
}
export function validateMediaParts(parts:{partNumber:number;etag:string}[],bytes:number,partBytes:number){
 const count=Math.ceil(bytes/partBytes);if(parts.length!==count)return false;
 return parts.every((part,index)=>part.partNumber===index+1&&/^\"?[A-Fa-f0-9-]{16,128}\"?$/.test(part.etag));
}
