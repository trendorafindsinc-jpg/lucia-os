import type {Metadata} from "next";
import {AnalyticsWorkspace} from "@/components/analytics/analytics-workspace";
import "./analytics.css";
export const metadata:Metadata={title:"Analytics & conversions | LUCIA OS",description:"Review privacy-conscious website analytics and conversion event prototypes."};
export default function AnalyticsPage(){return <AnalyticsWorkspace/>;}
