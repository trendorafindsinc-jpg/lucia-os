import type {Metadata} from "next";
import {BillingWorkspace} from "@/components/billing/billing-workspace";
import "./billing.css";
export const metadata:Metadata={title:"Plans & billing | LUCIA OS",description:"Explore billing cadence, trial and discount foundations for LUCIA OS."};
export default function BillingPage(){return <BillingWorkspace/>;}
