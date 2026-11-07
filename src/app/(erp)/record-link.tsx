"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { contextualDocumentHref } from "@/lib/contextual-navigation";
export default function RecordLink(props:ComponentProps<typeof Link>){
 const path=usePathname(),params=useSearchParams();
 const source=path+(params.size?"?"+params.toString():"");
 return <Link {...props} href={typeof props.href==="string"?contextualDocumentHref(props.href,source):props.href}/>;
}
