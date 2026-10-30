import { describe, expect, it } from "vitest";
import {
  validateDeploymentPath, validateFeatureConfiguration, isSoftwareIdentifier,
  isSoftwareVersion, hasMaintenanceCoverage, licenceCoversVersion,
  canMonetizeEndUserSubscriptions, type SoftwareLicence, type SoftwareVersion
} from "./contracts";

const licence: SoftwareLicence = {
  id:"licence-one",tenantId:"tenant-a",productId:"millions",versionId:"millions-1",
  status:"active",rights:{use:true,branding:true,subscriptionMonetization:false,resale:false},
  maintenanceStartsAt:"2026-01-01T00:00:00Z",maintenanceEndsAt:"2027-01-01T00:00:00Z",
  includedMajorVersionIds:[],entitlementRef:"trusted-server-entitlement"
};
const version:SoftwareVersion = {
  productId:"millions",id:"millions-1",number:"1.0.0",
  compatibility:{minRuntime:"1.0.0",supportedPlatforms:["lucia-os"]},
  features:["memberships"],configurationSchemaRef:"schema/millions/1",
  migrationRequired:false,releaseStatus:"released",
  security:{patchChannel:"major-v1",maintenancePolicyRef:"maintenance/millions/1"}
};

describe("Phase 7 software commerce type and validation contracts", () => {
  it("enforces stable product/version identifiers and releases",()=>{
    expect(isSoftwareIdentifier("millions")).toBe(true);
    expect(isSoftwareIdentifier("../staff")).toBe(false);
    expect(isSoftwareVersion(version)).toBe(true);
    expect(isSoftwareVersion({...version,id:"different-1"})).toBe(false);
    expect(isSoftwareVersion({...version,number:"latest"})).toBe(false);
    expect(isSoftwareVersion({...version,migrationRequired:true})).toBe(false);
    expect(isSoftwareVersion({...version,migrationRequired:true,migrationPolicyRef:"migration/v2"})).toBe(true);
  });
  it("validates configurable product features without accepting arbitrary keys or types",()=>{
    const schema = [
      {key:"subscriptions",type:"boolean",required:true},
      {key:"businessName",type:"text",maxLength:40},
      {key:"tier",type:"choice",allowedValues:["starter","pro"]},
      {key:"seats",type:"integer"}
    ] as const;
    expect(validateFeatureConfiguration(schema,{subscriptions:true,businessName:"Acme",tier:"pro",seats:25})).toBe(true);
    for (const invalid of [{}, {subscriptions:"true"}, {subscriptions:true,root:true}, {subscriptions:true,tier:"enterprise"}, {subscriptions:true,businessName:"x".repeat(41)}, {subscriptions:true,seats:-1}, {subscriptions:true,businessName:"hello\n"}]) expect(validateFeatureConfiguration(schema,invalid)).toBe(false);
  });
  it("validates and normalizes website app paths without overruling system routes",()=>{
    expect(validateDeploymentPath("/Millions")).toEqual({ok:true,path:"/millions"});
    expect(validateDeploymentPath("/members/community")).toEqual({ok:true,path:"/members/community"});
    for(const path of ["/api/test","/staff","/workspace","/editor","/templates","/settings","/auth/callback","/_next/static","/.well-known","/robots.txt","/admin","//evil.test","/%2e%2e/staff","/a/../staff","https://evil.test","/a?token=secret"])expect(validateDeploymentPath(path).ok,path).toBe(false);
    expect(validateDeploymentPath("/millions",["/millions"])).toEqual({ok:false,reason:"conflict"});
    expect(validateDeploymentPath("/millions/member",["/millions"])).toEqual({ok:false,reason:"conflict"});
    expect(validateDeploymentPath("/millions",["/millions/member"])).toEqual({ok:false,reason:"conflict"});
    expect(validateDeploymentPath("/millions",["/services"])).toEqual({ok:true,path:"/millions"});
  });
  it("does not expire purchased version rights when maintenance ends",()=>{
    expect(licenceCoversVersion(licence,"millions-1")).toBe(true);
    expect(licenceCoversVersion(licence,"millions-2")).toBe(false);
    expect(hasMaintenanceCoverage(licence,new Date("2026-06-01"))).toBe(true);
    expect(hasMaintenanceCoverage(licence,new Date("2027-05-01"))).toBe(false);
    expect(licenceCoversVersion(licence,"millions-1")).toBe(true);
    expect(licenceCoversVersion({...licence, includedMajorVersionIds:["millions-2"]},"millions-2")).toBe(true);
    expect(licenceCoversVersion({...licence,status:"revoked"},"millions-1")).toBe(false);
  });
  it("makes branding, resale and customer subscriptions explicit licence rights",()=>{
    expect(licence.rights.branding).toBe(true);
    expect(licence.rights.resale).toBe(false);
    expect(canMonetizeEndUserSubscriptions(licence)).toBe(false);
    expect(canMonetizeEndUserSubscriptions({...licence,rights:{...licence.rights,subscriptionMonetization:true}})).toBe(true);
  });
});
