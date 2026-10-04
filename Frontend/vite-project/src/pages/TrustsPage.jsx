import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HiOutlineArrowLeft, HiOutlineBuildingLibrary, HiOutlineMapPin, HiOutlineCheckCircle,
  HiOutlineExclamationTriangle, HiOutlinePencilSquare, HiOutlineHeart
} from "react-icons/hi2";
import MarketNav from "../components/MarketNav.jsx";
import { serverUrl } from "../App";

const EMPTY_FORM = {
  name: "",
  address: "",
  lat: "",
  lng: "",
  contactNumber: "",
  email: "",
  acceptedFoodTypes: "",
  registrationNumber: "",
  description: "",
  capacityPerDay: "",
  googlePayNumber: "",
  bankDetails: ""
};

const canManageTrusts = (role) => ["owner", "trustMember", "admin"].includes(role);

function TrustsPage() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [trusts, setTrusts] = useState([]);
  const [userTrust, setUserTrust] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingTrustId, setEditingTrustId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const trustOwnerId = (trust) => trust.owner?._id || trust.owner;

  const fetchTrusts = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/trusts`, { withCredentials: true });
      const list = result.data?.data || result.data || [];
      setTrusts(list);
      const myTrust = list.find((trust) => String(trustOwnerId(trust)) === String(userData?._id));
      setUserTrust(myTrust || null);
    } catch (err) {
      setError(err.response?.data?.message || t("trusts.loadError", "Failed to load trusts"));
    }
  };

  useEffect(() => {
    fetchTrusts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingTrustId(null);
    setPhotoFile(null);
    setPhotoPreview("");
    setLocationMessage("");
    setForm(EMPTY_FORM);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoFile(null);
      setPhotoPreview("");
    }
  };

  const useCurrentLocation = () => {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage(t("trusts.noGeo", "Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({ ...prev, lat: position.coords.latitude, lng: position.coords.longitude }));
        setLocationMessage(t("trusts.geoSet", "Coordinates set from your current location."));
      },
      (err) => setLocationMessage(`${t("trusts.geoFail", "Unable to get location")}: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadTrustForEdit = (trust) => {
    setEditingTrustId(trust._id);
    setForm({
      name: trust.name || "",
      address: trust.address || "",
      lat: trust.location?.lat ?? "",
      lng: trust.location?.lng ?? "",
      contactNumber: trust.contactNumber || "",
      email: trust.email || "",
      acceptedFoodTypes: trust.acceptedFoodTypes?.join(", ") || "",
      registrationNumber: trust.registrationNumber || "",
      description: trust.description || "",
      capacityPerDay: trust.capacityPerDay || "",
      googlePayNumber: trust.googlePayNumber || "",
      bankDetails: trust.bankDetails || ""
    });
    setPhotoFile(null);
    setPhotoPreview(trust.photo || "");
    setLocationMessage("");
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveTrust = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, value);
      });
      if (photoFile) formData.append("photo", photoFile);

      const url = editingTrustId ? `${serverUrl}/api/trusts/${editingTrustId}` : `${serverUrl}/api/trusts`;
      const method = editingTrustId ? axios.patch : axios.post;
      await method(url, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      setMessage(editingTrustId
        ? t("trusts.updated", "Trust details updated — thank you for keeping this lifeline current.")
        : t("trusts.created", "Trust registered — meals now have a destination."));
      resetForm();
      fetchTrusts();
    } catch (err) {
      setError(err.response?.data?.message || t("trusts.saveError", "Failed to save trust details"));
    }
  };

  const TrustForm = ({ heading, submitLabel }) => (
    <form className="grain card p-5 sm:p-6" onSubmit={saveTrust}>
      <div className="mb-5 flex items-start gap-3">
        <span className="mode-rescue flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <HiOutlineBuildingLibrary size={22} />
        </span>
        <div>
          <p className="t-eyebrow" style={{ color: "var(--rescue)" }}>
            {editingTrustId ? t("trusts.editEyebrow", "Keep it current") : t("trusts.registerEyebrow", "Register a trust")}
          </p>
          <h2 className="t-title mt-1">{heading}</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            {t("trusts.formHint", "Share where surplus food can land. A photo and pin location help riders find you fast.")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.name", "Trust name")}</span>
          <input className="w-full px-3 py-2" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
        </label>
        <label className="block">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.contact", "Contact number")}</span>
          <input className="w-full px-3 py-2" value={form.contactNumber} onChange={(e) => updateField("contactNumber", e.target.value)} required />
        </label>
        <label className="block">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.email", "Email")}</span>
          <input type="email" className="w-full px-3 py-2" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
        </label>
        <label className="block">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.regNumber", "Registration number")}</span>
          <input className="w-full px-3 py-2" value={form.registrationNumber} onChange={(e) => updateField("registrationNumber", e.target.value)} />
        </label>
        <label className="block">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.capacity", "Meals you can receive per day")}</span>
          <input type="number" min="0" className="w-full px-3 py-2" value={form.capacityPerDay} onChange={(e) => updateField("capacityPerDay", e.target.value)} />
        </label>
        <label className="block">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.gpay", "Google Pay number")}</span>
          <input className="w-full px-3 py-2" value={form.googlePayNumber} onChange={(e) => updateField("googlePayNumber", e.target.value)} />
        </label>
        <label className="block">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.foodTypes", "Food you accept (comma separated)")}</span>
          <input className="w-full px-3 py-2" placeholder={t("trusts.foodTypesHint", "Veg meals, Fruits, Bakery")} value={form.acceptedFoodTypes} onChange={(e) => updateField("acceptedFoodTypes", e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="t-eyebrow mb-1.5 block">{t("trusts.lat", "Latitude")}</span>
            <input className="w-full px-3 py-2" value={form.lat} onChange={(e) => updateField("lat", e.target.value)} required />
          </label>
          <label className="block">
            <span className="t-eyebrow mb-1.5 block">{t("trusts.lng", "Longitude")}</span>
            <input className="w-full px-3 py-2" value={form.lng} onChange={(e) => updateField("lng", e.target.value)} required />
          </label>
        </div>
        <button type="button" className="btn-ghost md:col-span-2" onClick={useCurrentLocation}>
          <HiOutlineMapPin /> {t("trusts.useLocation", "Use my current location")}
        </button>
        {locationMessage && (
          <p className="text-xs md:col-span-2" style={{ color: "var(--ink-muted)" }}>{locationMessage}</p>
        )}
        <label className="block md:col-span-2">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.address", "Pickup address")}</span>
          <textarea className="min-h-[76px] w-full px-3 py-2" value={form.address} onChange={(e) => updateField("address", e.target.value)} required />
        </label>
        <label className="block md:col-span-2">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.description", "About the trust")}</span>
          <textarea className="min-h-[76px] w-full px-3 py-2" placeholder={t("trusts.descriptionHint", "Who you serve, and when someone can drop food off.")} value={form.description} onChange={(e) => updateField("description", e.target.value)} />
        </label>
        <label className="block md:col-span-2">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.bank", "Bank details (for online delivery-charge payments)")}</span>
          <textarea className="min-h-[60px] w-full px-3 py-2" value={form.bankDetails} onChange={(e) => updateField("bankDetails", e.target.value)} />
        </label>
        <label className="block md:col-span-2">
          <span className="t-eyebrow mb-1.5 block">{t("trusts.photo", "Trust photo")}</span>
          <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full px-3 py-2" />
          {photoPreview && (
            <img src={photoPreview} alt={t("trusts.photoAlt", "Trust preview")} className="mt-3 h-36 w-full max-w-[260px] rounded-2xl object-cover shadow-md" style={{ border: "1px solid var(--border)" }} />
          )}
        </label>
      </div>

      {message && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          <HiOutlineCheckCircle size={16} /> {message}
        </p>
      )}
      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <HiOutlineExclamationTriangle size={16} /> {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn-primary flex-1">{submitLabel}</button>
        {editingTrustId && (
          <button type="button" className="btn-ghost flex-1" onClick={resetForm}>{t("common.cancel", "Cancel")}</button>
        )}
      </div>
    </form>
  );

  return (
    <div className="min-h-screen lg:pl-[76px]">
      <MarketNav />

      <main className="mx-auto w-full max-w-[1050px] px-4 pb-16 pt-6 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-eyebrow flex items-center gap-1.5" style={{ color: "var(--rescue)" }}>
              <HiOutlineHeart /> {t("trusts.eyebrow", "Rescue network")}
            </p>
            <h1 className="t-display mt-2">{t("trusts.title", "Trusted hands, full plates")}</h1>
            <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--ink-muted)" }}>
              {t("trusts.subtitle", "Every trust here turns surplus into meals. Register yours, or keep its details fresh.")}
            </p>
          </div>
          <button className="btn-ghost !px-3.5 !py-2 text-xs" onClick={() => navigate("/")}>
            <HiOutlineArrowLeft /> {t("common.back", "Back")}
          </button>
        </header>

        {canManageTrusts(userData?.role) && !userTrust && !editingTrustId && (
          <div className="mt-6">
            <TrustForm heading={t("trusts.registerHeading", "Put your trust on the map")} submitLabel={t("trusts.registerCta", "Register trust")} />
          </div>
        )}

        {editingTrustId && (
          <div className="mt-6">
            <TrustForm heading={t("trusts.editHeading", "Update this trust")} submitLabel={t("trusts.updateCta", "Save changes")} />
          </div>
        )}

        {canManageTrusts(userData?.role) && userTrust && !editingTrustId && (
          <p className="mt-6 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--rescue-soft)", color: "var(--rescue)" }}>
            <HiOutlineCheckCircle size={16} />
            {t("trusts.alreadyRegistered", "You manage")} <strong className="font-black">{userTrust.name}</strong>. {t("trusts.editFromCard", "Use Edit on its card to update details.")}
          </p>
        )}

        <div className="stagger mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {trusts.map((trust) => {
            const canEdit = userData?.role === "admin" || String(trustOwnerId(trust)) === String(userData?._id);
            return (
              <article key={trust._id} className="grain card card-hover overflow-hidden">
                {trust.photo && (
                  <img src={trust.photo} alt={trust.name} className="h-40 w-full object-cover" style={{ borderBottom: "1px solid var(--border)" }} />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="t-title" style={{ color: "var(--rescue)" }}>{trust.name}</h2>
                      <p className="mt-1 flex items-start gap-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>
                        <HiOutlineMapPin size={15} className="mt-0.5 shrink-0" style={{ color: "var(--rescue)" }} />
                        {trust.address}
                      </p>
                    </div>
                    {canEdit && (
                      <button type="button" onClick={() => loadTrustForEdit(trust)} className="btn-ghost !px-3 !py-1.5 text-xs">
                        <HiOutlinePencilSquare size={14} /> {t("common.edit", "Edit")}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                    <p><span className="font-bold" style={{ color: "var(--ink-soft)" }}>{trust.contactNumber}</span> · {trust.email}</p>
                    {trust.registrationNumber && <p>{t("trusts.regLabel", "Reg")} {trust.registrationNumber}</p>}
                    {trust.capacityPerDay && <p>{t("trusts.capacityLabel", "Capacity")} {trust.capacityPerDay}/day</p>}
                    {trust.googlePayNumber && <p>GPay {trust.googlePayNumber}</p>}
                  </div>

                  {trust.description && (
                    <p className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>{trust.description}</p>
                  )}

                  {trust.acceptedFoodTypes?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {trust.acceptedFoodTypes.map((type) => (
                        <span key={`${trust._id}-${type}`} className="mode-rescue rounded-full px-3 py-1 text-[11px] font-bold">{type}</span>
                      ))}
                    </div>
                  )}

                  {trust.location?.lat != null && (
                    <p className="mt-3 text-xs" style={{ color: "var(--ink-faint)" }}>
                      {trust.location.lat}, {trust.location.lng}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {trusts.length === 0 && (
          <div className="grain card mt-8 p-10 text-center">
            <span className="text-4xl" aria-hidden="true">🌾</span>
            <p className="mt-3 font-bold">{t("trusts.empty", "No trusts registered yet.")}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              {t("trusts.emptyHint", "Be the first to give surplus food a destination.")}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default TrustsPage;
