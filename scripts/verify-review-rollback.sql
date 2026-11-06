-- Regression checks against current shared data, not clean PDF fixtures.
-- All test document/stock/journal changes roll back in a subtransaction.
-- PostgreSQL sequences are nontransactional; test numbers can be skipped.
do $qa$
declare
  actor uuid; stock_before text; stock_after text; counts_before text; counts_after text;
  so text; inv text; payment text; hold_no text; receipt text; sess text; lead_no text;
  expiry_hold text; reserved_before integer;
  cash_before numeric; stock_qty integer; result jsonb := '[]'; rejected boolean;
  test_error text; test_state text; key_prefix text := 'review-' || gen_random_uuid()::text;
begin
  select id into actor from auth.users where email='qa-owner@kopiselakota.test';
  if actor is null then raise exception 'QA Owner missing'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  select md5(string_agg(sku||location_code||on_hand::text,',' order by sku,location_code)) into stock_before from public.stock_balances;
  select concat_ws(',',(select count(*) from public.sales_orders),(select count(*) from public.customer_invoices),(select count(*) from public.customer_payments),(select count(*) from public.pos_holds),(select count(*) from public.pos_receipts),(select count(*) from public.journal_entries),(select count(*) from public.journal_lines),(select count(*) from public.inventory_reservations),(select count(*) from public.audit_events)) into counts_before;
  begin
    perform set_config('request.jwt.claim.sub',(select id::text from auth.users where email='qa-sales@kopiselakota.test'),true);
    lead_no := public.create_lead('C05','CBW-250',2,40,key_prefix||'-lead');
    perform public.update_lead_stage(lead_no,'Qualified',null);
    rejected := false;
    begin perform public.update_lead_stage(lead_no,'Lost',null);
    exception when others then if sqlerrm like '%Alasan wajib%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Lost without reason accepted'; end if;
    perform public.update_lead_stage(lead_no,'Lost','Jadwal acara berubah');
    if not exists(select 1 from public.leads where number=lead_no and stage='Lost' and lost_reason='Jadwal acara berubah') then raise exception 'CRM Lost did not persist'; end if;
    result := result || jsonb_build_array('PASS CRM Qualified / Lost reason rejection and persistence');

    rejected:=false;
    begin perform public.create_sales_order('C06','CBW-250',1,0,key_prefix||'-cod',null);
    exception when others then if sqlerrm like '%Limit kredit%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Credit limit zero was bypassed'; end if;
    result := result || jsonb_build_array('PASS zero credit limit rejects unpaid SO');

    so := public.create_sales_order('C05','CBW-250',2,0,key_prefix||'-so',null);
    if public.create_sales_order('C05','CBW-250',2,0,key_prefix||'-so',null)<>so then raise exception 'SO replay duplicated'; end if;
    perform set_config('request.jwt.claim.sub',(select id::text from auth.users where email='qa-finance@kopiselakota.test'),true);
    rejected:=false;
    begin perform public.invoice_delivered_sales_order(so,key_prefix||'-early-invoice');
    exception when others then if sqlerrm like '%terkirim%' or sqlerrm like '%Delivered%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Undelivered goods were invoiced'; end if;
    perform set_config('request.jwt.claim.sub',(select id::text from auth.users where email='qa-warehouse@kopiselakota.test'),true);
    perform public.deliver_sales_order(so,1,key_prefix||'-delivery');
    rejected:=false;
    begin perform public.deliver_sales_order(so,2,key_prefix||'-over-delivery');
    exception when others then if sqlerrm like '%melebihi%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Over delivery accepted'; end if;
    perform set_config('request.jwt.claim.sub',(select id::text from auth.users where email='qa-finance@kopiselakota.test'),true);
    inv := public.invoice_delivered_sales_order(so,key_prefix||'-invoice');
    if not exists(select 1 from public.customer_invoices where number=inv and total=33000 and amount_paid=0) then raise exception 'Delivered-only invoice not 33000'; end if;
    if (select status from public.sales_orders where number=so)<>'Partial Delivery' then raise exception 'Partial invoice closed remaining delivery'; end if;
    perform set_config('request.jwt.claim.sub',(select id::text from auth.users where email='qa-warehouse@kopiselakota.test'),true);
    perform public.deliver_sales_order(so,1,key_prefix||'-remaining-delivery');
    perform set_config('request.jwt.claim.sub',(select id::text from auth.users where email='qa-finance@kopiselakota.test'),true);
    perform public.invoice_delivered_sales_order(so,key_prefix||'-remaining-invoice');
    if (select status from public.sales_orders where number=so)<>'Invoiced' then raise exception 'Fully delivered/invoiced order did not close'; end if;
    result:=result||jsonb_build_array('PASS partial invoice keeps remaining delivery open / second delivery and second invoice succeed');
    payment := public.record_customer_payment(inv,10000,'1102',key_prefix||'-payment');
    if public.record_customer_payment(inv,10000,'1102',key_prefix||'-payment')<>payment then raise exception 'Payment replay duplicated'; end if;
    if not exists(select 1 from public.customer_invoices where number=inv and total-amount_paid-amount_credited=23000) then raise exception 'Partial invoice remainder incorrect'; end if;
    rejected:=false;
    begin perform public.record_customer_payment(inv,23001,'1102',key_prefix||'-overpay');
    exception when others then if sqlerrm like '%melebihi%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Overpayment accepted'; end if;
    result := result || jsonb_build_array('PASS SO replay / undelivered invoice rejection / partial delivery / over delivery rejection / invoice 33000 / partial payment 10000 remaining 23000 / payment replay / overpayment rejection');

    perform set_config('request.jwt.claim.sub',actor::text,true);
    select number,coalesce(expected_cash,opening_cash) into sess,cash_before from public.pos_sessions where opened_by=actor and status='Open';
    if sess is null then
      sess:=public.open_pos_session((select opening_cash from public.pos_configuration where id='POS-TBT'),key_prefix||'-session');
      select coalesce(expected_cash,opening_cash) into cash_before from public.pos_sessions where number=sess;
    end if;
    select on_hand into stock_qty from public.stock_balances where sku='TEH-250' and location_code='CAFE-TBT';
    hold_no:=public.create_pos_hold('[{"sku":"TEH-250","quantity":1}]'::jsonb,10,key_prefix||'-hold');
    rejected:=false;
    begin perform public.complete_pos_hold(hold_no,'[{"payment_method":"CASH","amount":1000}]'::jsonb,key_prefix||'-partial');
    exception when others then if sqlerrm like '%harus sama%' then rejected:=true; else raise; end if; end;
    if not rejected or exists(select 1 from public.pos_receipts where hold_number=hold_no) or (select on_hand from public.stock_balances where sku='TEH-250' and location_code='CAFE-TBT')<>stock_qty then raise exception 'Partial tender changed receipt or stock'; end if;
    update public.pos_sessions set status='Closed' where number=sess;
    rejected:=false;
    begin perform public.complete_pos_hold(hold_no,'[{"payment_method":"CASH","amount":3300},{"payment_method":"BANK","amount":3300}]'::jsonb,key_prefix||'-closed');
    exception when others then if sqlerrm like '%Sesi POS sudah ditutup%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Closed session accepted checkout'; end if;
    update public.pos_sessions set status='Open' where number=sess;
    receipt:=public.complete_pos_hold(hold_no,'[{"payment_method":"CASH","amount":3300},{"payment_method":"BANK","amount":3300}]'::jsonb,key_prefix||'-checkout');
    if (select count(*) from public.pos_receipt_tenders where receipt_number=receipt)<>2 then raise exception 'Missing split tenders'; end if;
    if (select sum(amount) from public.pos_receipt_tenders where receipt_number=receipt)<>6600 then raise exception 'Incorrect tender total'; end if;
    if (select coalesce(expected_cash,opening_cash) from public.pos_sessions where number=sess)<>cash_before+3300 then raise exception 'Bank increased cash drawer'; end if;
    if (select on_hand from public.stock_balances where sku='TEH-250' and location_code='CAFE-TBT')<>stock_qty-1 then raise exception 'POS stock decrement incorrect'; end if;
    if not exists(select 1 from public.pos_holds where number=hold_no and status='Completed') then raise exception 'Hold not completed'; end if;
    if public.complete_pos_hold(hold_no,'[{"payment_method":"CASH","amount":3300},{"payment_method":"BANK","amount":3300}]'::jsonb,key_prefix||'-checkout')<>receipt then raise exception 'POS replay duplicated'; end if;
    rejected:=false;
    begin perform public.complete_pos_hold(hold_no,'[{"payment_method":"CASH","amount":6600}]'::jsonb,key_prefix||'-checkout');
    exception when others then if sqlerrm like '%tender berbeda%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Replay with changed tender accepted'; end if;
    if exists(select 1 from public.journal_entries je join public.journal_lines jl on jl.journal_entry_id=je.id where je.source_reference=receipt group by je.id having sum(jl.debit)<>sum(jl.credit)) then raise exception 'Unbalanced POS journal'; end if;
    result:=result||jsonb_build_array('PASS incomplete tender no stock/receipt / closed session rejection / mixed tender 6600 / cash drawer +3300 only / stock -1 / Completed hold / replay no duplicate / changed replay rejected / balanced POS journal');
    rejected:=false;
    begin perform public.create_pos_sale('TEH-250',1,'MIXED',key_prefix||'-invalid-direct-mixed');
    exception when others then if sqlerrm like '%Checkout Hold%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Direct mixed payment accepted without split tenders'; end if;
    result:=result||jsonb_build_array('PASS direct MIXED rejected before posting; split checkout remains supported');
    receipt:=public.create_pos_sale('TEH-250',1,'BANK',key_prefix||'-direct');
    if (select count(*) from public.pos_receipt_lines where receipt_number=receipt)<>1
      or (select count(*) from public.pos_receipt_tenders where receipt_number=receipt and payment_method='BANK' and amount=6600)<>1 then
      raise exception 'Direct sale details missing';
    end if;
    if public.create_pos_sale('TEH-250',1,'BANK',key_prefix||'-direct')<>receipt
      or (select count(*) from public.pos_receipt_tenders where receipt_number=receipt)<>1 then
      raise exception 'Direct sale replay duplicated details';
    end if;
    result:=result||jsonb_build_array('PASS direct BANK sale real line/tender and replay without duplicates');
    expiry_hold:=public.create_pos_hold('[{"sku":"TEH-250","quantity":1}]'::jsonb,10,key_prefix||'-expiry');
    select reserved into reserved_before from public.inventory_availability where sku='TEH-250' and location_code='CAFE-TBT';
    update public.pos_holds set created_at=now()-interval '11 minutes',expires_at=now()-interval '1 minute' where number=expiry_hold;
    if (select reserved from public.inventory_availability where sku='TEH-250' and location_code='CAFE-TBT')<>reserved_before-1 then raise exception 'Expired hold still reduces availability'; end if;
    perform public._expire_pos_holds_system();
    if not exists(select 1 from public.pos_holds where number=expiry_hold and status='Expired') or exists(select 1 from public.inventory_reservations where source_type='pos_hold' and source_reference=expiry_hold and status='active') then raise exception 'System cleanup did not release expired hold'; end if;
    perform public._expire_pos_holds_system();
    if (select count(*) from public.audit_events where action='expire' and document_number=expiry_hold)<>1 then raise exception 'Expiry audit duplicated'; end if;
    if not exists(select 1 from cron.job where jobname='kopi-sela-expire-pos-holds' and active and schedule='* * * * *') then raise exception 'Expiry cron missing or inactive'; end if;
    result:=result||jsonb_build_array('PASS expiry immediately restores availability / scheduled cleanup releases reservation / single audit / cron active');
    hold_no:=public.create_pos_hold_for_customer('[{"sku":"TEH-250","quantity":1}]'::jsonb,10,key_prefix||'-customer-hold','C06');
    if public.create_pos_hold_for_customer('[{"sku":"TEH-250","quantity":1}]'::jsonb,10,key_prefix||'-customer-hold','C06')<>hold_no then raise exception 'Customer Hold replay duplicated'; end if;
    rejected:=false;
    begin perform public.create_pos_hold_for_customer('[{"sku":"TEH-250","quantity":1}]'::jsonb,10,key_prefix||'-customer-hold','C05');
    exception when others then if sqlerrm like '%Customer atau pelaku berbeda%' then rejected:=true; else raise; end if; end;
    if not rejected then raise exception 'Hold customer replay changed'; end if;
    receipt:=public.complete_pos_hold(hold_no,'[{"payment_method":"CASH","amount":3300},{"payment_method":"BANK","amount":3300}]'::jsonb,key_prefix||'-customer-checkout');
    if not exists(select 1 from public.pos_receipts where number=receipt and customer_id='C06' and total=6600) then raise exception 'Hold customer missing from receipt'; end if;
    if (select count(*) from public.customer_invoices)<>(split_part(counts_before,',',2)::integer+2) then raise exception 'POS created unexpected invoice'; end if;
    result:=result||jsonb_build_array('PASS Hold Customer C06 / identical replay / changed Customer rejected / mixed receipt retains Customer / no duplicate invoice');
    raise exception using errcode='ZQ001',message='Intentional rollback of test documents';
  exception when sqlstate 'ZQ001' then null;
    when others then get stacked diagnostics test_error=message_text,test_state=returned_sqlstate;
  end;
  select md5(string_agg(sku||location_code||on_hand::text,',' order by sku,location_code)) into stock_after from public.stock_balances;
  select concat_ws(',',(select count(*) from public.sales_orders),(select count(*) from public.customer_invoices),(select count(*) from public.customer_payments),(select count(*) from public.pos_holds),(select count(*) from public.pos_receipts),(select count(*) from public.journal_entries),(select count(*) from public.journal_lines),(select count(*) from public.inventory_reservations),(select count(*) from public.audit_events)) into counts_after;
  perform set_config('qa.review_result',jsonb_build_object('passed',test_error is null and stock_before=stock_after and counts_before=counts_after,'checks',result,'error',test_error,'sqlstate',test_state,'stock_unchanged',stock_before=stock_after,'document_counts_unchanged',counts_before=counts_after,'scope','Current-data regression; not full PDF fixtures or UI test')::text,false);
end;
$qa$;
select current_setting('qa.review_result')::jsonb as regression_result;
