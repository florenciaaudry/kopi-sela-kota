import { WorkflowWorkspace, type WorkflowMessage } from "../workflow-workspace";
export const metadata={title:"Quotations"};
export default async function Page({searchParams}:{searchParams:Promise<WorkflowMessage>}){return <WorkflowWorkspace kind="quotation" message={await searchParams}/>;}
