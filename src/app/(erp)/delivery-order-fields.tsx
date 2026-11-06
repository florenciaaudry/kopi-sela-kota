"use client";

import { useState } from "react";
import { SelectField } from "./select-field";

export type DeliverableSalesOrder = {
  number: string;
  status: string;
  customerLabel: string;
  sku: string;
  productName: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
};

export function DeliveryOrderFields({
  orders,
}: {
  orders: DeliverableSalesOrder[];
}) {
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");
  const [quantity, setQuantity] = useState(1);

  const selected = orders.find((item) => item.number === selectedOrderNumber);
  const options = orders.map((item) => ({
    value: item.number,
    label: `${item.number} · ${item.status}`,
  }));

  return (
    <>
      <SelectField
        label="Sales Order"
        name="sales_order_number"
        placeholder="Pilih Sales Order…"
        options={options}
        value={selectedOrderNumber}
        onValueChange={(nextValue) => {
          setSelectedOrderNumber(nextValue);
          const nextOrder = orders.find((item) => item.number === nextValue);
          if (nextOrder && nextOrder.remainingQuantity > 0) {
            setQuantity(nextOrder.remainingQuantity);
          } else {
            setQuantity(1);
          }
        }}
      />
      <label className="demo-field">
        <span>Done Quantity</span>
        <input
          name="quantity"
          required
          type="number"
          min={1}
          max={selected ? Math.max(1, selected.remainingQuantity) : undefined}
          step={1}
          value={Number.isNaN(quantity) ? "" : quantity}
          onChange={(event) => setQuantity(event.target.valueAsNumber)}
        />
      </label>
      <p className="muted-copy">
        {selected
          ? `Pesanan ${selected.number} (${selected.customerLabel}) · ${selected.sku} ${selected.productName} · Dipesan ${selected.orderedQuantity} unit, terkirim ${selected.deliveredQuantity} unit, sisa dapat dikirim ${selected.remainingQuantity} unit.`
          : orders.length === 0
            ? "Belum ada Sales Order berstatus Sales Order atau Partial Delivery yang siap dikirim."
            : "Pilih Sales Order untuk melihat rincian produk dan sisa kuantitas yang dapat dikirim."}
      </p>
    </>
  );
}

