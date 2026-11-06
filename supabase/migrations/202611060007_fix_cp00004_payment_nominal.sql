-- Retired before deployment: never infer a payment from an invoice's total.
-- CP00004 is recorded as Rp330. Whether Rp330 or Rp330000 was intended
-- requires confirmation. Posted payments and journals must retain their history.
-- Any confirmed correction needs a separately reviewed, auditable transaction.
select '007 retired: no historical payment or journal changed' as migration_note;
