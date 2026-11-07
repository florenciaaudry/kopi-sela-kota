import { WorkflowWorkspace, type WorkflowMessage } from "../workflow-workspace";
export const metadata={title:"Requests for Quotation"};
export default async function Page({searchParams}:{searchParams:Promise<WorkflowMessage>}){return <WorkflowWorkspace kind="rfq" message={await searchParams}/>;}
