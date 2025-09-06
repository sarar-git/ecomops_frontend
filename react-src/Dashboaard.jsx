// Dashboard.jsx
import React, { useEffect, useState } from "react";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const token = localStorage.getItem("sb-access-token");
        const res = await fetch(
          "https://ecomops-sarar20225.onrender.com/dashboard/summary",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch summary");
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("⚠️ Error fetching summary:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!summary) return <div className="p-6 text-red-600">No data</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Shipped Orders" value={summary.shipped_orders} />
        <Card title="Cancelled Orders" value={summary.cancelled_orders} />
        <Card title="Returned Orders" value={summary.returned_orders} />
        <Card title="Order Value" value={summary.total_order_value} currency />
        <Card title="Paid" value={summary.total_paid} currency />
        <Card title="Charges" value={summary.total_charges} currency />
        <Card title="Outstanding" value={summary.total_outstanding} currency />
      </div>

      {/* Breakdown by website */}
      <div>
        <h2 className="text-xl font-semibold mb-4">By Website</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(summary.by_website).map(([site, stats]) => (
            <Card key={site} title={site}>
              <ul className="text-sm space-y-1">
                <li>Orders: {stats.orders}</li>
                <li>Paid: ₹{stats.paid.toLocaleString("en-IN")}</li>
                <li>Charges: ₹{stats.charges.toLocaleString("en-IN")}</li>
                <li>Order Value: ₹{stats.order_value.toLocaleString("en-IN")}</li>
                <li>Outstanding: ₹{stats.outstanding.toLocaleString("en-IN")}</li>
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, currency, children }) {
  return (
    <div className="bg-white shadow rounded-xl p-4">
      <h3 className="text-gray-600 text-sm">{title}</h3>
      {children ? (
        children
      ) : (
        <p className="text-lg font-semibold">
          {currency ? "₹" + (value || 0).toLocaleString("en-IN") : value}
        </p>
      )}
    </div>
  );
}
