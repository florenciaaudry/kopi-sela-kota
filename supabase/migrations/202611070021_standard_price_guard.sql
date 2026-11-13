-- PDF SR-19: Standard Price, no purchase price variance. Future writes only.
begin;
create function public._assert_standard_purchase(p_sku text,p_price numeric)returns void language plpgsql security definer set search_path='' as $$
declare standard numeric;
begin
 select standard_cost into standard from public.product_costs where sku=p_sku for share;
 if standard is null or p_price is null or p_price is distinct from standard then raise exception 'Purchase Price harus sama dengan Standard Cost untuk %; selisih harga beli tidak termasuk skenario ini',p_sku;end if;
end;$$;
revoke all on function public._assert_standard_purchase(text,numeric)from public,anon,authenticated;
do $upgrade$
declare definition text;needle text;
begin
 definition:=pg_get_functiondef('public.save_vendor_price(text,text,integer,numeric,text,text)'::regprocedure);
 needle:=' insert into public.vendor_pricelist';if position(needle in definition)=0 then raise exception 'save_vendor_price source tidak cocok; upgrade dibatalkan';end if;
 definition:=replace(definition,needle,E' perform public._assert_standard_purchase(p_sku,p_purchase_price);\n'||needle);execute definition;
 definition:=pg_get_functiondef('public.create_purchase_order(text,text,integer,text)'::regprocedure);
 needle:='  total_amount := p_quantity * price_row.purchase_price;';if position(needle in definition)=0 then raise exception 'create_purchase_order source tidak cocok; upgrade dibatalkan';end if;
 definition:=replace(definition,needle,E'  perform public._assert_standard_purchase(p_sku,price_row.purchase_price);\n'||needle);execute definition;
 definition:=pg_get_functiondef('public.confirm_rfq(text,text)'::regprocedure);
 needle:='  for item in select * from public.rfq_lines where rfq_number=p_number loop';if position(needle in definition)=0 then raise exception 'confirm_rfq source tidak cocok; upgrade dibatalkan';end if;
 definition:=replace(definition,needle,needle||E'\n   perform public._assert_standard_purchase(item.sku,item.unit_price);');execute definition;
 definition:=pg_get_functiondef('public.receive_purchase_order_lines(text,jsonb,text)'::regprocedure);
 needle:='  total_value:=total_value+item.accepted_quantity*l.unit_price;';if position(needle in definition)=0 then raise exception 'receive_purchase_order_lines source tidak cocok; upgrade dibatalkan';end if;
 definition:=replace(definition,needle,E'  if item.accepted_quantity>0 then perform public._assert_standard_purchase(item.sku,l.unit_price);end if;\n'||needle);execute definition;
 definition:=pg_get_functiondef('public.create_vendor_bill(text,text)'::regprocedure);
 needle:='total_amount:=total_amount+(l.received_quantity-l.billed_quantity)*l.unit_price;';if position(needle in definition)=0 then raise exception 'create_vendor_bill source tidak cocok; upgrade dibatalkan';end if;
 definition:=replace(definition,needle,'if l.received_quantity>l.billed_quantity then perform public._assert_standard_purchase(l.sku,l.unit_price);end if;'||needle);execute definition;
end;$upgrade$;
create function public.get_purchase_policy_version()returns integer language plpgsql security definer set search_path='' as $$begin perform public.require_transaction_role(array['owner','procurement','warehouse','finance']::public.app_role[]);return 21;end;$$;
revoke all on function public.get_purchase_policy_version()from public,anon;
grant execute on function public.get_purchase_policy_version()to authenticated;
notify pgrst,'reload schema';
commit;
