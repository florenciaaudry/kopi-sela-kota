type Amount = number | string;
export function receiptReconciles(receipt:{quantity:Amount;subtotal:Amount;tax_amount:Amount;total:Amount},lines:{quantity:Amount;subtotal:Amount;tax_amount:Amount}[],tenders:{amount:Amount}[]) {
 const cents=(value:Amount)=>Math.round(Number(value)*100);
 const validMoney=(value:Amount)=>Number.isFinite(Number(value))&&Number(value)>=0;
 const validQuantity=(value:Amount)=>Number.isSafeInteger(Number(value))&&Number(value)>0;
 return [receipt.subtotal,receipt.tax_amount,receipt.total].every(validMoney) && validQuantity(receipt.quantity)
  && lines.every(line=>validQuantity(line.quantity)&&validMoney(line.subtotal)&&validMoney(line.tax_amount))
  && tenders.every(tender=>Number.isFinite(Number(tender.amount))&&Number(tender.amount)>0)
  && lines.length>0 && tenders.length>0 && lines.reduce((sum,line)=>sum+Number(line.quantity),0)===Number(receipt.quantity)
  && lines.reduce((sum,line)=>sum+cents(line.subtotal),0)===cents(receipt.subtotal)
  && lines.reduce((sum,line)=>sum+cents(line.tax_amount),0)===cents(receipt.tax_amount)
  && cents(receipt.subtotal)+cents(receipt.tax_amount)===cents(receipt.total)
  && tenders.reduce((sum,tender)=>sum+cents(tender.amount),0)===cents(receipt.total);
}
