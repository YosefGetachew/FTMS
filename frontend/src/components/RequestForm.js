import { useEffect, useMemo, useState, useCallback } from "react";
import API from "../services/api";
import "./request-form.css";

const Field = ({ name, label, required, hint, children, touched, errors }) => {
  const showError = Boolean(touched?.[name] && errors?.[name]);

  return (
    <div className="space-y-2">
      <label
        className={`ministry-label ${required ? "required" : ""} ${
          showError ? "error" : ""
        }`}
      >
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>

      {children}

      {showError ? (
        <div className="text-xs text-rose-600">{errors[name]}</div>
      ) : (
        hint && <div className="helper">{hint}</div>
      )}
    </div>
  );
};

const StepIndicator = ({ step, setStep, step1Valid, step2Valid }) => (
  <div className="mb-8">
    {/* spacing is handled by .stepper-row in CSS */}
    <div className="stepper-row">
      <button
        type="button"
        onClick={() => setStep(1)}
        className={`step-btn ${step === 1 ? "active" : ""}`}
      >
        1. Traveler
      </button>

      <button
        type="button"
        onClick={() => step1Valid && setStep(2)}
        disabled={!step1Valid}
        className={`step-btn ${step === 2 ? "active" : ""} ${
          !step1Valid ? "disabled" : ""
        }`}
      >
        2. Trip
      </button>

      <button
        type="button"
        onClick={() => step1Valid && step2Valid && setStep(3)}
        disabled={!step1Valid || !step2Valid}
        className={`step-btn ${step === 3 ? "active" : ""} ${
          !step1Valid || !step2Valid ? "disabled" : ""
        }`}
      >
        3. Attachments
      </button>
    </div>

    <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full transition-all duration-300"
        style={{
          width: step === 1 ? "33%" : step === 2 ? "66%" : "100%",
          background: "var(--ministry-primary)",
        }}
      />
    </div>
  </div>
);

const FileBox = ({ label, name, file, setFormData, handleFileChange }) => (
  <div className="filebox">
    <div className="filebox-row">
      {/* ✅ Upload button in front (left) */}
      <label className="secondary-btn cursor-pointer filebox-upload">
        Upload
        <input
          type="file"
          name={name}
          accept="application/pdf,image/png,image/jpeg"
          onClick={(e) => (e.currentTarget.value = null)}
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      <div className="filebox-content">
        <div className="ministry-label no-box">{label}</div>

        <div className="filebox-filename">
          {file?.name ? file.name : "Optional — PDF/JPG/PNG"}
        </div>

        {file?.name && (
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                [name]: null,
              }))
            }
            className="filebox-remove"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  </div>
);

export default function RequestForm() {
  const categoryOptions = useMemo(
    () => ["Higher Officials", "Experts", "Affiliate Institute"],
    []
  );

  const initialFormData = useMemo(
    () => ({
      travelerCategory: "",
      organizationName: "",
      assignedStateMinisterId: "",
      fullName: "",
      position: "",
      department: "",
      email: "",
      phone: "",

      country: "",
      startDate: "",
      endDate: "",
      purpose: "",
      sponsor: "",
      passportNumber: "",

      // ✅ attachments OPTIONAL
      passportFile: null,
      invitationLetter: null,
      torFile: null,
    }),
    []
  );

  const [formData, setFormData] = useState(initialFormData);
  const [countries, setCountries] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [stateMinisters, setStateMinisters] = useState([]);
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState({});
  const [notice, setNotice] = useState({ type: "", message: "" });

  const [loading, setLoading] = useState({
    organizations: false,
    countries: false,
    stateMinisters: false,
    submitting: false,
  });

  const markTouched = (name) => setTouched((p) => ({ ...p, [name]: true }));

  const touchMany = (names) => {
    setTouched((prev) => {
      const next = { ...prev };
      names.forEach((n) => (next[n] = true));
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target || {};
    if (!name) return;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // keep dates consistent
      if (name === "startDate" && next.endDate && next.endDate < value) {
        next.endDate = "";
      }

      // if travelerCategory changes away from Affiliate Institute, clear organization
      if (name === "travelerCategory" && value !== "Affiliate Institute") {
        next.organizationName = "";
      }

      return next;
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files?.[0] || null }));
  };

  // ✅ Validation
  const errors = useMemo(() => {
    const v = {};

    // Step 1 required
    if (!formData.travelerCategory) {
      v.travelerCategory = "Traveler Category is required.";
    }

    if (
      formData.travelerCategory === "Affiliate Institute" &&
      !formData.organizationName
    ) {
      v.organizationName = "Please select an organization.";
    }

    if (!formData.assignedStateMinisterId) {
      v.assignedStateMinisterId = "Please select a sector.";
    }

    if (!formData.fullName.trim()) v.fullName = "Full name is required.";
    if (!formData.position.trim()) v.position = "Position is required.";
    if (!formData.department.trim()) v.department = "Department is required.";

    const email = (formData.email || "").trim();
    if (!email) {
      v.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      v.email = "Enter a valid email address.";
    }

    // Step 2 required
    if (!formData.country.trim()) v.country = "Destination country is required.";
    if (!formData.startDate) v.startDate = "Start date is required.";
    if (!formData.endDate) v.endDate = "End date is required.";

    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      v.endDate = "End date must be on or after start date.";
    }

    if (!formData.purpose.trim()) v.purpose = "Purpose is required.";

    // Step 3 attachments OPTIONAL -> no checks

    return v;
  }, [formData]);

  const step1Valid =
    !errors.travelerCategory &&
    !errors.organizationName &&
    !errors.assignedStateMinisterId &&
    !errors.fullName &&
    !errors.position &&
    !errors.department &&
    !errors.email;

  const step2Valid =
    !errors.country && !errors.startDate && !errors.endDate && !errors.purpose;

  const canSubmit = step1Valid && step2Valid;

  const fetchOrganizations = useCallback(async () => {
    setLoading((p) => ({ ...p, organizations: true }));
    try {
      const response = await API.get("/affiliate-institutions");
      setOrganizations(response.data || []);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Unable to load organizations." });
    } finally {
      setLoading((p) => ({ ...p, organizations: false }));
    }
  }, []);

  const fetchStateMinisters = useCallback(async () => {
    setLoading((p) => ({ ...p, stateMinisters: true }));
    try {
      const response = await API.get("/state-ministers");
      setStateMinisters(response.data || []);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Unable to load sectors." });
    } finally {
      setLoading((p) => ({ ...p, stateMinisters: false }));
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    setLoading((p) => ({ ...p, countries: true }));
    try {
      const response = await fetch("https://restcountries.com/v3.1/all?fields=name");
      const data = await response.json();

      const countryNames = (data || [])
        .map((c) => c?.name?.common)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setCountries(countryNames);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Unable to load countries." });
    } finally {
      setLoading((p) => ({ ...p, countries: false }));
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
    fetchStateMinisters();
    fetchCountries();
  }, [fetchOrganizations, fetchStateMinisters, fetchCountries]);

  const goNext = () => {
    setNotice({ type: "", message: "" });

    if (step === 1) {
      touchMany([
        "travelerCategory",
        ...(formData.travelerCategory === "Affiliate Institute" ? ["organizationName"] : []),
        "assignedStateMinisterId",
        "fullName",
        "position",
        "department",
        "email",
      ]);

      if (!step1Valid) {
        setNotice({
          type: "error",
          message: "Please complete the required fields in this step.",
        });
        return;
      }
    }

    if (step === 2) {
      touchMany(["country", "startDate", "endDate", "purpose"]);

      if (!step2Valid) {
        setNotice({
          type: "error",
          message: "Please fix the highlighted fields before continuing.",
        });
        return;
      }
    }

    setStep((p) => Math.min(3, p + 1));
  };

  const goBack = () => setStep((p) => Math.max(1, p - 1));

  const resetForm = ({ keepNotice = false } = {}) => {
    if (!keepNotice) setNotice({ type: "", message: "" });
    setFormData(initialFormData);
    setTouched({});
    setStep(1);
  };

  // ✅ Submit ONLY by button click (never automatic)
  const submitRequest = async () => {
    setNotice({ type: "", message: "" });

    touchMany([
      "travelerCategory",
      ...(formData.travelerCategory === "Affiliate Institute" ? ["organizationName"] : []),
      "assignedStateMinisterId",
      "fullName",
      "position",
      "department",
      "email",
      "country",
      "startDate",
      "endDate",
      "purpose",
    ]);

    if (!canSubmit) {
      setNotice({
        type: "error",
        message: "Please complete required fields before submitting.",
      });
      return;
    }

    setLoading((p) => ({ ...p, submitting: true }));

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        const val = formData[key];
        if (val !== null && val !== undefined && val !== "") {
          data.append(key, val);
        }
      });

      // ✅ Let axios set multipart headers automatically (safer)
      await API.post("/requests", data);

      setNotice({
        type: "success",
        message: "Travel Request submitted successfully.",
      });

      resetForm({ keepNotice: true });
    } catch (err) {
      console.error("Submit error:", err);

      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Error submitting request. Please try again.";

      setNotice({
        type: "error",
        message: typeof serverMsg === "string" ? serverMsg : "Error submitting request.",
      });
    } finally {
      setLoading((p) => ({ ...p, submitting: false }));
    }
  };

  return (
    <div className="ministry-page min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mb-7">
          <div className="header-strip w-24 mb-3" />
          <h1 className="text-2xl font-extrabold text-slate-900">
            New Travel Request
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Simple steps. Only essential details first — optional information later.
          </p>
        </div>

        {notice.message && (
          <div
            className={`mb-6 ${
              notice.type === "success" ? "notice-success" : "notice-error"
            }`}
          >
            {notice.message}
          </div>
        )}

        <form className="ministry-card p-6 md:p-8" onSubmit={(e) => e.preventDefault()}>
          <StepIndicator
            step={step}
            setStep={setStep}
            step1Valid={step1Valid}
            step2Valid={step2Valid}
          />

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <div className="section-title text-base">Traveler</div>
                <div className="section-subtitle">
                  Fill in traveler details. Traveler Category is mandatory.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* ✅ Traveler Category dropdown (required) */}
                <div className="md:col-span-2">
                  <Field
                    name="travelerCategory"
                    label="Traveler Category"
                    required
                    touched={touched}
                    errors={errors}
                  >
                    <select
                      name="travelerCategory"
                      value={formData.travelerCategory}
                      onChange={handleChange}
                      onBlur={() => markTouched("travelerCategory")}
                      required
                      className="ministry-input"
                    >
                      <option value="">Select Category</option>
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Affiliate organization only when needed */}
                {formData.travelerCategory === "Affiliate Institute" && (
                  <div className="md:col-span-2">
                    <Field
                      name="organizationName"
                      label="Organization Name"
                      required
                      hint="Only for Affiliate Institute travelers."
                      touched={touched}
                      errors={errors}
                    >
                      <select
                        name="organizationName"
                        value={formData.organizationName}
                        onChange={handleChange}
                        onBlur={() => markTouched("organizationName")}
                        required
                        disabled={loading.organizations}
                        className="ministry-input"
                      >
                        <option value="">
                          {loading.organizations
                            ? "Loading organizations..."
                            : "Select Organization"}
                        </option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.organization_name}>
                            {org.organization_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}

                <Field
                  name="assignedStateMinisterId"
                  label="Sector"
                  required
                  touched={touched}
                  errors={errors}
                >
                  <select
                    name="assignedStateMinisterId"
                    value={formData.assignedStateMinisterId}
                    onChange={handleChange}
                    onBlur={() => markTouched("assignedStateMinisterId")}
                    required
                    disabled={loading.stateMinisters}
                    className="ministry-input"
                  >
                    <option value="">
                      {loading.stateMinisters ? "Loading sectors..." : "Select Sector"}
                    </option>
                    {stateMinisters.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.sector}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field name="fullName" label="Full Name" required touched={touched} errors={errors}>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={() => markTouched("fullName")}
                    className="ministry-input"
                    required
                  />
                </Field>

                <Field name="position" label="Position" required touched={touched} errors={errors}>
                  <input
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    onBlur={() => markTouched("position")}
                    className="ministry-input"
                    required
                  />
                </Field>

                <Field name="department" label="Department" required touched={touched} errors={errors}>
                  <input
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    onBlur={() => markTouched("department")}
                    className="ministry-input"
                    required
                  />
                </Field>

                <Field name="email" label="Email" required touched={touched} errors={errors}>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => markTouched("email")}
                    className="ministry-input"
                    required
                  />
                </Field>

                <Field name="phone" label="Phone Number" hint="Optional" touched={touched} errors={errors}>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="ministry-input"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <div className="section-title text-base">Trip</div>
                <div className="section-subtitle">
                  Provide destination, dates, and purpose.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field name="country" label="Destination Country" required touched={touched} errors={errors}>
                  <input
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    onBlur={() => markTouched("country")}
                    list="countries"
                    className="ministry-input"
                    disabled={loading.countries}
                    required
                  />
                  <datalist id="countries">
                    {countries.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>

                <Field name="startDate" label="Start Date" required touched={touched} errors={errors}>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    onBlur={() => markTouched("startDate")}
                    className="ministry-input"
                    required
                  />
                </Field>

                <Field
                  name="endDate"
                  label="End Date"
                  required
                  hint="Must be on/after Start Date."
                  touched={touched}
                  errors={errors}
                >
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    onBlur={() => markTouched("endDate")}
                    min={formData.startDate || undefined}
                    className="ministry-input"
                    required
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field
                    name="purpose"
                    label="Purpose of Travel"
                    required
                    touched={touched}
                    errors={errors}
                  >
                    <textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      onBlur={() => markTouched("purpose")}
                      rows={5}
                      className="ministry-input"
                      required
                    />
                  </Field>
                </div>

                <Field name="sponsor" label="Sponsor / Funding Source" hint="Optional" touched={touched} errors={errors}>
                  <input
                    name="sponsor"
                    value={formData.sponsor}
                    onChange={handleChange}
                    className="ministry-input"
                  />
                </Field>

                <Field name="passportNumber" label="Passport Number" hint="Optional" touched={touched} errors={errors}>
                  <input
                    name="passportNumber"
                    value={formData.passportNumber}
                    onChange={handleChange}
                    className="ministry-input"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <div className="section-title text-base">Attachments</div>
                <div className="section-subtitle">
                  Optional — attach documents to speed up processing.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <FileBox
                  label="Passport Copy"
                  name="passportFile"
                  file={formData.passportFile}
                  setFormData={setFormData}
                  handleFileChange={handleFileChange}
                />
                <FileBox
                  label="Invitation Letter"
                  name="invitationLetter"
                  file={formData.invitationLetter}
                  setFormData={setFormData}
                  handleFileChange={handleFileChange}
                />
                <FileBox
                  label="Terms of Reference (TOR)"
                  name="torFile"
                  file={formData.torFile}
                  setFormData={setFormData}
                  handleFileChange={handleFileChange}
                />
              </div>

              <div className="review-box">
                <span className="font-semibold">Review:</span>{" "}
                Attachments are optional. Click “Submit Request” when ready.
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => resetForm()} className="secondary-btn">
              Reset
            </button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {step > 1 && (
                <button type="button" onClick={goBack} className="secondary-btn">
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="primary-btn"
                  disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitRequest}
                  className="primary-btn"
                  disabled={loading.submitting || !canSubmit}
                >
                  {loading.submitting ? "Submitting..." : "Submit Request"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}