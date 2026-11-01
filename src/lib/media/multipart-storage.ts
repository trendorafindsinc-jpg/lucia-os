import { createHash, createHmac } from "node:crypto";
export type CompletedPart={partNumber:number;etag:string};
export type StoredObjectHead={bytes:number;mime:string;etag:string|null;checksum:string|null};
const safeKey=/^os\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:webp|mp4|webm|pdf)$/;
const digest=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
const hmac=(key:string|Buffer,value:string)=>createHmac("sha256",key).update(value).digest();
const encode=(value:string)=>encodeURIComponent(value).replace(/[!'()*]/g,c=>"%"+c.charCodeAt(0).toString(16).toUpperCase());
function canonicalQuery(values:Record<string,string>){return Object.entries(values).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>encode(k)+"="+encode(v)).join("&");}
function config(){
 const endpoint=new URL(process.env.S3_ENDPOINT||"");const bucket=process.env.S3_BUCKET||"";
 if(!process.env.S3_ACCESS_KEY_ID||!process.env.S3_SECRET_ACCESS_KEY||endpoint.protocol!=="https:"||endpoint.username||endpoint.password||endpoint.pathname!=="/"||endpoint.search||!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)||!process.env.S3_REGION)throw Error("Customer media storage is not configured.");
 return {endpoint,bucket,region:process.env.S3_REGION,access:process.env.S3_ACCESS_KEY_ID,secret:process.env.S3_SECRET_ACCESS_KEY};
}
function objectUrl(key:string,query:Record<string,string>={}){if(!safeKey.test(key))throw Error("Invalid media object key.");const {endpoint,bucket}=config();const url=new URL("/"+bucket+"/"+key,endpoint);const qs=canonicalQuery(query);if(qs)url.search=qs;return url;}
async function signedRequest(method:string,key:string,query:Record<string,string>={},extra:Record<string,string>={},body=""){
 const c=config(),url=objectUrl(key,query),date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,""),day=date.slice(0,8),payload=digest(body);
 const headers:Record<string,string>={host:url.host,"x-amz-content-sha256":payload,"x-amz-date":date,...extra};
 const names=Object.keys(headers).map(x=>x.toLowerCase()).sort();const canonicalHeaders=names.map(name=>name+":"+headers[name].trim().replace(/\s+/g," ")+"\n").join("");
 const scope=day+"/"+c.region+"/s3/aws4_request";const canonical=[method,url.pathname,url.search.slice(1),canonicalHeaders,names.join(";"),payload].join("\n");
 const stringToSign="AWS4-HMAC-SHA256\n"+date+"\n"+scope+"\n"+digest(canonical);
 const signingKey=hmac(hmac(hmac(hmac("AWS4"+c.secret,day),c.region),"s3"),"aws4_request");
 const signature=createHmac("sha256",signingKey).update(stringToSign).digest("hex");
 headers.authorization="AWS4-HMAC-SHA256 Credential="+c.access+"/"+scope+", SignedHeaders="+names.join(";")+", Signature="+signature;
 return fetch(url,{method,headers,...(body?{body}:{}),signal:AbortSignal.timeout(15000),redirect:"error",cache:"no-store"});
}
function presignedPart(key:string,uploadId:string,partNumber:number,expires=900){
 const c=config(),date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,""),day=date.slice(0,8),scope=day+"/"+c.region+"/s3/aws4_request";
 const url=objectUrl(key);const query={partNumber:String(partNumber),uploadId,"X-Amz-Algorithm":"AWS4-HMAC-SHA256","X-Amz-Credential":c.access+"/"+scope,"X-Amz-Date":date,"X-Amz-Expires":String(expires),"X-Amz-SignedHeaders":"host"};
 const canonical=[ "PUT",url.pathname,canonicalQuery(query),"host:"+url.host+"\n","host","UNSIGNED-PAYLOAD"].join("\n");
 const stringToSign="AWS4-HMAC-SHA256\n"+date+"\n"+scope+"\n"+digest(canonical);
 const signingKey=hmac(hmac(hmac(hmac("AWS4"+c.secret,day),c.region),"s3"),"aws4_request");
 const signature=createHmac("sha256",signingKey).update(stringToSign).digest("hex");
 return url.origin+url.pathname+"?"+canonicalQuery({...query,"X-Amz-Signature":signature});
}
export const MULTIPART_PART_BYTES=8*1024*1024;
export function isSafeMediaObjectKey(key:string){return safeKey.test(key);}
function bucketUrl(query:Record<string,string>){const {endpoint,bucket}=config();const url=new URL("/"+bucket,endpoint);const qs=canonicalQuery(query);if(qs)url.search=qs;return url;}
async function signedBucketRequest(method:string,query:Record<string,string>={}){
 const c=config(),url=bucketUrl(query),date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,""),day=date.slice(0,8),payload=digest("");
 const headers:Record<string,string>={host:url.host,"x-amz-content-sha256":payload,"x-amz-date":date};const names=Object.keys(headers).sort();
 const canonicalHeaders=names.map(name=>name+":"+headers[name].trim()+"\n").join("");const scope=day+"/"+c.region+"/s3/aws4_request";
 const canonical=[method,url.pathname,url.search.slice(1),canonicalHeaders,names.join(";"),payload].join("\n");
 const stringToSign="AWS4-HMAC-SHA256\n"+date+"\n"+scope+"\n"+digest(canonical);
 const signingKey=hmac(hmac(hmac(hmac("AWS4"+c.secret,day),c.region),"s3"),"aws4_request");
 const signature=createHmac("sha256",signingKey).update(stringToSign).digest("hex");
 headers.authorization="AWS4-HMAC-SHA256 Credential="+c.access+"/"+scope+", SignedHeaders="+names.join(";")+", Signature="+signature;
 return fetch(url,{method,headers,signal:AbortSignal.timeout(15000),redirect:"error",cache:"no-store"});
}
function decodeXml(value:string){return value.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'");}
export const multipartStorage={
 async create(key:string,mime:string,kind:"video"|"document",checksum:string){
  const response=await signedRequest("POST",key,{uploads:""},{"content-type":mime,"x-amz-server-side-encryption":"AES256","x-amz-meta-sha256":checksum,"x-amz-meta-kind":kind});
  if(!response.ok)throw Error("Could not start the customer media upload.");const xml=await response.text();const id=xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];if(!id)throw Error("Storage did not return a multipart upload identifier.");return id;
 },
 signPart(key:string,uploadId:string,partNumber:number){if(!Number.isInteger(partNumber)||partNumber<1||partNumber>10000)throw Error("Invalid upload part.");return presignedPart(key,uploadId,partNumber);},
 async listIncomplete(prefix="os/",limit=1000){const response=await signedBucketRequest("GET",{uploads:"",prefix,"max-uploads":String(Math.min(1000,Math.max(1,limit)))});if(!response.ok)throw Error("Incomplete multipart uploads could not be listed.");const xml=await response.text();return [...xml.matchAll(/<Upload>([\s\S]*?)<\/Upload>/g)].map(match=>{const key=decodeXml(match[1].match(/<Key>([\s\S]*?)<\/Key>/)?.[1]??"");const uploadId=decodeXml(match[1].match(/<UploadId>([\s\S]*?)<\/UploadId>/)?.[1]??"");const initiated=match[1].match(/<Initiated>([\s\S]*?)<\/Initiated>/)?.[1]??"";return {key,uploadId,initiated:Date.parse(initiated)};}).filter(item=>isSafeMediaObjectKey(item.key)&&item.uploadId&&Number.isFinite(item.initiated));},
 async complete(key:string,uploadId:string,parts:CompletedPart[]){
  const xml="<CompleteMultipartUpload>"+parts.map(p=>"<Part><PartNumber>"+p.partNumber+"</PartNumber><ETag>"+p.etag.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</ETag></Part>").join("")+"</CompleteMultipartUpload>";
  const response=await signedRequest("POST",key,{uploadId},{"content-type":"application/xml"},xml);const text=await response.text();if(!response.ok||/<Error>/.test(text))throw Error("Storage could not complete the multipart upload.");return text.match(/<ETag>([^<]+)<\/ETag>/)?.[1]??null;
 },
 async abort(key:string,uploadId:string){const response=await signedRequest("DELETE",key,{uploadId});if(!response.ok&&response.status!==404)throw Error("Storage could not abort the multipart upload.");},
 async head(key:string):Promise<StoredObjectHead|null>{const response=await signedRequest("HEAD",key);if(response.status===404)return null;if(!response.ok)throw Error("Stored media metadata could not be verified.");return {bytes:Number(response.headers.get("content-length")??0),mime:response.headers.get("content-type")??"",etag:response.headers.get("etag"),checksum:response.headers.get("x-amz-meta-sha256")};},
 async remove(key:string){const response=await signedRequest("DELETE",key);if(!response.ok&&response.status!==404)throw Error("Stored media could not be removed.");},
 async stream(key:string,range?:string){const response=await signedRequest("GET",key,{},range?{range}:{});if(response.status===404)return null;if(!(response.ok||response.status===206||response.status===416))throw Error("Stored media could not be read.");return response;}
};
