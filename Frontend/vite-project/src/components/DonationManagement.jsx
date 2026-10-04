import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import { useNavigate } from "react-router-dom";
import { HiOutlineArrowTopRightOnSquare, HiOutlineClock, HiOutlineMapPin } from "react-icons/hi2";

const STATUSES = ["pending", "accepted", "picked_up", "delivered", "cancelled"];

const STATUS_TONE = {
  pending: { background: "var(--warning-soft)", color: "var(--warning)" },
  accepted: { background: "var(--accent-2-soft)", color: "var(--accent-2)" },
  picked_up: { background: "var(--plan-soft)", color: "var(--plan)" },
  delivered: { background: "var(--rescue-soft)", color: "var(--rescue)" },
  cancelled: { background: "var(--danger-soft)", color: "var(--danger)" }
};

const fmt = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/* Trust console — the rescue queue. Donation cards with inline trust +
   rider assignment, payment line, and status progression. */
function DonationManagement() {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [trusts, setTrusts] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [donationsRes, trustsRes, deliveryBoysRes] = await Promise.all([
        axios.get(`${serverUrl}/api/donations`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/trusts`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/delivery-boys`, { withCredentials: true })
      ]);
      setDonations(donationsRes.data || []);
      setTrusts(trustsRes.data || []);
      setDeliveryBoys(deliveryBoysRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load donation management");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const flash = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3200);
  };

  const replaceDonation = (updatedDonation) => {
    setDonations(prev => prev.map(donation => donation._id === updatedDonation._id ? updatedDonation : donation));
  };

  const assignTrust = async (donationId, trustId) => {
    if (!trustId) return;
    try {
      const result = await axios.patch(`${serverUrl}/api/donations/${donationId}/assign-trust`, { trustId }, { withCredentials: true });
      replaceDonation(result.data.donation);
      flash("Trust assigned");
    } catch (err) {
      setError(err.response?.data?.message || "Could not assign trust");
    }
  };

  const assignDelivery = async (donationId, deliveryBoyId) => {
    if (!deliveryBoyId) return;
    try {
      const result = await axios.patch(`${serverUrl}/api/donations/${donationId}/assign-delivery`, { deliveryBoyId }, { withCredentials: true });
      replaceDonation(result.data.donation);
      flash("Rider assigned");
    } catch (err) {
      setError(err.response?.data?.message || "Could not assign rider");
    }
  };

  const updateStatus = async (donationId, status) => {
    try {
      const result = await axios.patch(`${serverUrl}/api/donations/${donationId}/status`, { status }, { withCredentials: true });
      replaceDonation(result.data.donation);
      flash("Donation status updated");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update status");
    }
  };

  const acceptDonation = async (donation) => {
    const method = window.prompt("Delivery charge payment method: online or offline", donation.deliveryChargePaymentMethod === "pending" ? "online" : donation.deliveryChargePaymentMethod);
    if (!method || !["online", "offline"].includes(method.toLowerCase())) return;
    try {
      const result = await axios.patch(`${serverUrl}/api/donations/${donation._id}/status`, {
        status: "accepted",
        deliveryChargePaymentMethod: method.toLowerCase(),
        deliveryChargePaymentStatus: "paid"
      }, { withCredentials: true });
      replaceDonation(result.data.donation);
      flash(method.toLowerCase() === "online"
        ? "Accepted — riders have been notified"
        : "Accepted — delivery charge marked for offline payment");
    } catch (err) {
      setError(err.response?.data?.message || "Could not accept donation");
    }
  };

  const open = donations.filter(donation => ["pending", "accepted"].includes(donation.status));
  const inTransit = donations.filter(donation => donation.status === "picked_up");
  const deliveredCount = donations.filter(donation => donation.status === "delivered").length;
  const unitsRescued = donations
    .filter(donation => donation.status === "delivered")
    .reduce((sum, donation) => sum + (Array.isArray(donation.foodItems)
      ? donation.foodItems.reduce((s, item) => s + (parseFloat(item.quantity) || 0), 0)
      : 0), 0);

  return (
    <div className="w-full max-w-6xl px-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="t-title">Donation queue</h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--ink-soft)" }}>
            Accept surplus food, settle the delivery charge, put a rider on the road.
          </p>
        </div>
        {message && (
          <span className="rounded-full px-3.5 py-1.5 text-xs font-black" style={{ background: "var(--rescue-soft)", color: "var(--rescue)" }}>
            {message}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-3 rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {/* bento counters */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="tile tile-rescue grain p-4">
          <p className="t-eyebrow">Open donations</p>
          <p className="mt-1.5 font-display text-2xl font-black" style={{ fontFamily: "var(--font-display)", color: "var(--rescue)" }}>{open.length}</p>
        </div>
        <div className="tile grain p-4" style={{ "--tile-tint": "var(--plan-soft)" }}>
          <p className="t-eyebrow">In transit</p>
          <p className="mt-1.5 font-display text-2xl font-black" style={{ fontFamily: "var(--font-display)", color: "var(--plan)" }}>{inTransit.length}</p>
        </div>
        <div className="tile grain p-4" style={{ "--tile-tint": "var(--accent-2-soft)" }}>
          <p className="t-eyebrow">Delivered</p>
          <p className="mt-1.5 font-display text-2xl font-black" style={{ fontFamily: "var(--font-display)", color: "var(--accent-2)" }}>{deliveredCount}</p>
        </div>
        <div className="tile grain p-4" style={{ "--tile-tint": "var(--accent-soft)" }}>
          <p className="t-eyebrow">Units rescued</p>
          <p className="mt-1.5 font-display text-2xl font-black" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>{Math.round(unitsRescued)}</p>
        </div>
      </div>

      {/* donation cards */}
      <div className="stagger mt-5 space-y-4">
        {donations.map((donation) => {
          const tone = STATUS_TONE[donation.status] || STATUS_TONE.pending;
          return (
            <article key={donation._id} className="grain card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="notranslate font-bold">{donation.donorId?.fullName || "Unknown"}</p>
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {donation.donorRole} · {donation.donorId?.mobile || donation.donorId?.email}
                  </p>
                </div>
                <span className="rounded-full px-3.5 py-1.5 text-xs font-black capitalize" style={tone}>
                  {donation.status.replace("_", " ")}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(donation.foodItems || []).map((item, index) => (
                  <span key={`${donation._id}-item-${index}`} className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--rescue-soft)", color: "var(--rescue)" }}>
                    {item.name} — {item.quantity} {item.unit}
                  </span>
                ))}
              </div>

              <div className="mt-3 grid gap-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>
                <p className="flex items-center gap-1.5"><HiOutlineMapPin size={15} style={{ color: "var(--rescue)" }} /> {donation.pickupAddress}</p>
                <p className="flex items-center gap-1.5"><HiOutlineClock size={15} style={{ color: "var(--rescue)" }} /> Pickup {fmt(donation.pickupTime)} · best before {fmt(donation.expiryTime)}</p>
              </div>

              <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-3" style={{ borderColor: "var(--border)" }}>
                <label className="text-xs font-bold" style={{ color: "var(--ink-muted)" }}>
                  Trust
                  <select className="mt-1 w-full px-3 py-2 text-sm font-normal" value={donation.assignedTrustId?._id || ""} onChange={(e) => assignTrust(donation._id, e.target.value)}>
                    <option value="">Assign trust</option>
                    {trusts.map((trust) => (
                      <option value={trust._id} key={trust._id}>{trust.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold" style={{ color: "var(--ink-muted)" }}>
                  Delivery partner
                  <select className="mt-1 w-full px-3 py-2 text-sm font-normal" value={donation.assignedDeliveryBoyId?._id || ""} onChange={(e) => assignDelivery(donation._id, e.target.value)}>
                    <option value="">Assign rider</option>
                    {deliveryBoys.map((boy) => (
                      <option value={boy._id} key={boy._id}>{boy.fullName}</option>
                    ))}
                  </select>
                </label>
                <div className="text-xs font-bold" style={{ color: "var(--ink-muted)" }}>
                  Delivery charge
                  <p className="mt-1 rounded-xl px-3 py-2 text-sm font-normal" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>
                    ₹{donation.deliveryCharge || 50} · <span className="capitalize">{donation.deliveryChargePaymentMethod}</span> / <span className="capitalize">{donation.deliveryChargePaymentStatus}</span>
                  </p>
                  {donation.assignedTrustId?.googlePayNumber && (
                    <p className="mt-1 font-normal" style={{ color: "var(--ink-muted)" }}>GPay: {donation.assignedTrustId.googlePayNumber}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {donation.status === "pending" && (
                  <button className="rounded-full px-4 py-2 text-xs font-black transition-transform active:scale-95" style={{ background: "var(--rescue)", color: "#08130c" }} onClick={() => acceptDonation(donation)}>
                    Accept donation
                  </button>
                )}
                <select className="px-3 py-2 text-sm" value={donation.status} onChange={(e) => updateStatus(donation._id, e.target.value)} aria-label="Update donation status">
                  {STATUSES.map((status) => (
                    <option value={status} key={status}>{status.replace("_", " ")}</option>
                  ))}
                </select>
                <button className="link-brand ml-auto inline-flex items-center gap-1 text-xs" onClick={() => navigate("/trusts")}>
                  <HiOutlineArrowTopRightOnSquare size={14} /> Trust directory
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {donations.length === 0 && (
        <div className="grain card mt-5 p-10 text-center">
          <span className="text-4xl" aria-hidden="true">🌾</span>
          <p className="mt-3" style={{ color: "var(--ink-muted)" }}>No donations in the queue yet.</p>
        </div>
      )}
    </div>
  );
}

export default DonationManagement;
