import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import API from "../services/api";
import "./request-form.css";

const workflowPath = {
  sector_structure: [
    "Expert",
    "Lead Executive Officer",
    "State Minister",
    "Protocol for Clearance",
    "Office Head",
    "Minister",
    "Protocol PM Submission",
    "PM Office",
  ],
  ceo_structure: [
    "Expert",
    "Lead Executive Officer",
    "CEO",
    "Protocol for Clearance",
    "Office Head",
    "Minister",
    "Protocol PM Submission",
    "PM Office",
  ],
  office_head_structure: [
    "Expert",
    "Lead Executive Officer",
    "Protocol for Clearance",
    "Office Head",
    "Protocol PM Submission",
    "PM Office",
  ],
  minister_structure: [
    "Expert",
    "Minister",
    "Protocol PM Submission",
    "PM Office",
  ],
  affiliate_institution: [
    "Expert",
    "Director General",
    "Protocol for Clearance",
    "Office Head",
    "Protocol PM Submission",
    "PM Office",
  ],
  project: [
    "Project Staff",
    "Project Coordinator",
    "Parent Structure Approver",
    "Protocol for Clearance",
    "Office Head",
    "Protocol PM Submission",
    "PM Office",
  ],
};

const moaStructureTypes = [
  {
    value: "sector_structure",
    label: "Sector",
    ownerLabel: "State Minister",
  },
  {
    value: "ceo_structure",
    label: "CEO",
    ownerLabel: "CEO",
  },
  {
    value: "office_head_structure",
    label: "Head of the Minister's Office",
    ownerLabel: "Head of the Minister's Office",
  },
  {
    value: "minister_structure",
    label: "Minister",
    ownerLabel: "Minister",
  },
];

const fallbackCountries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahrain",
  "Bangladesh",
  "Belgium",
  "Benin",
  "Botswana",
  "Brazil",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Congo",
  "Cote d'Ivoire",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Egypt",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guinea",
  "Hungary",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Laos",
  "Lebanon",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Niger",
  "Nigeria",
  "Norway",
  "Oman",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Sweden",
  "Switzerland",
  "Syria",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tunisia",
  "Turkey",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
].sort((a, b) => a.localeCompare(b));

const getTripDuration = (startDate, endDate) => {
  if (!startDate || !endDate || endDate < startDate) return null;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.round((end - start) / 86400000) + 1;

  return days > 0 ? days : null;
};

const normalizePhonePreview = (value) => {
  const raw = String(value || "").trim().replace(/\s+/g, "");
  if (!raw) return "";

  if (/^\+251[97]\d{8}$/.test(raw)) return raw;
  if (/^0[97]\d{8}$/.test(raw)) return `+251${raw.slice(1)}`;
  if (/^[97]\d{8}$/.test(raw)) return `+251${raw}`;

  return raw;
};

const Field = ({ name, label, required, hint, children, touched, errors }) => {
  const showError = Boolean(touched?.[name] && errors?.[name]);

  return (
    <div className="space-y-2">
      <label className={`ministry-label ${required ? "required" : ""} ${showError ? "error" : ""}`}>
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
    <div className="stepper-row">
      {[
        {
          number: "1",
          label: "Traveler",
          description: "Organization and contact details",
          stepNumber: 1,
          enabled: true,
        },
        {
          number: "2",
          label: "Trip",
          description: "Destination, dates, and purpose",
          stepNumber: 2,
          enabled: step1Valid,
        },
        {
          number: "3",
          label: "Attachments",
          description: "Documents and final review",
          stepNumber: 3,
          enabled: step1Valid && step2Valid,
        },
      ].map(({ number, label, description, stepNumber, enabled }) => (
        <button
          key={stepNumber}
          type="button"
          onClick={() => enabled && setStep(stepNumber)}
          disabled={!enabled}
          className={`step-btn ${step === stepNumber ? "active" : ""} ${!enabled ? "disabled" : ""}`}
        >
          <span className="step-btn-number">{number}</span>
          <span className="step-btn-copy">
            <span className="step-btn-label">{label}</span>
            <small>{description}</small>
          </span>
        </button>
      ))}
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
      <label className="secondary-btn cursor-pointer filebox-upload">
        Upload
        <input
          type="file"
          name={name}
          accept="application/pdf,image/png,image/jpeg"
          onClick={(e) => {
            e.currentTarget.value = null;
          }}
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      <div className="filebox-content">
        <div className="ministry-label no-box">{label}</div>
        <div className="filebox-filename">{file?.name || "Optional - PDF/JPG/PNG"}</div>
        {file?.name && (
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, [name]: null }))}
            className="filebox-remove"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  </div>
);

const RadioCards = ({ name, value, onChange, options, cols = 2 }) => (
  <div className={`radio-cards cols-${cols}`}>
    {options.map((opt) => (
      <label
        key={opt.value}
        className={`radio-card ${opt.route ? "with-route" : ""} ${value === opt.value ? "selected" : ""}`}
      >
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(name, opt.value)}
          className="hidden"
        />
        <span className="radio-card-title">{opt.label}</span>
        {opt.description && <span className="radio-card-desc">{opt.description}</span>}
        {opt.route && (
          <span className="radio-card-flow" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </label>
    ))}
  </div>
);

const Divider = ({ label }) => (
  <div className="form-divider">
    <div className="form-divider-line" />
    <span className="form-divider-label">{label}</span>
    <div className="form-divider-line" />
  </div>
);

const SectionHeader = ({ eyebrow, title, subtitle }) => (
  <div className="request-section-title">
    {eyebrow && <span>{eyebrow}</span>}
    <h2>{title}</h2>
    {subtitle && <p>{subtitle}</p>}
  </div>
);

const ChoicePanel = ({ title, description, children }) => (
  <div className="choice-panel">
    <div className="choice-panel-heading">
      <span>{title}</span>
      {description && <small>{description}</small>}
    </div>
    {children}
  </div>
);

export default function RequestForm() {
  const travelerTypeOptions = [
    {
      value: "higher_official",
      label: "Higher Official",
      description: "Senior leadership",
      route: "Leadership route",
    },
    {
      value: "advisor",
      label: "Advisor",
      description: "Advisory office",
      route: "Advisor route",
    },
    {
      value: "project",
      label: "Project Staff",
      description: "Staff under project coordinator",
      route: "Project route",
    },
    {
      value: "expert",
      label: "Expert",
      description: "Technical staff",
      route: "Expert route",
    },
  ];

  const allWorkflowOptions = [
    ...moaStructureTypes.map((item) => ({
      ...item,
      description: `${item.ownerLabel} route`,
      route: workflowPath[item.value].join(" -> "),
    })),
  ];

  const initialFormData = useMemo(
    () => ({
      organizationType: "",
      travelerType: "",
      workflowType: "",
      sector: "",
      leadExecutiveOffice: "",
      organizationName: "",
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
      passportFile: null,
      invitationLetter: null,
      torFile: null,
    }),
    []
  );

  const [formData, setFormData] = useState(initialFormData);
  const [countries, setCountries] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [moaSectors, setMoaSectors] = useState([]);
  const [leadExecutiveOffices, setLeadExecutiveOffices] = useState([]);
  const [moaProjects, setMoaProjects] = useState([]);
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState({});
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const submitInFlightRef = useRef(false);
  const [loading, setLoading] = useState({
    countries: false,
    organizations: false,
    moaSectors: false,
    leadExecutiveOffices: false,
    moaProjects: false,
    submitting: false,
  });

  const isMoA = formData.organizationType === "moa";
  const isAffiliate = formData.organizationType === "affiliate";

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []);

  const tripDuration = useMemo(
    () => getTripDuration(formData.startDate, formData.endDate),
    [formData.startDate, formData.endDate]
  );

  const workflowOptions = allWorkflowOptions.filter(
    (item) => item.value !== "minister_structure" || formData.travelerType === "advisor"
  );

  const selectedWorkflow = workflowOptions.find(
    (item) => item.value === formData.workflowType
  );
  const selectedStructureTypeLabel = selectedWorkflow?.label || "MoA Structure";
  const selectedOwnerLabel = selectedWorkflow?.ownerLabel || "Approver";
  const advisorRoutesThroughProtocol = [
    "office_head_structure",
    "minister_structure",
  ].includes(formData.workflowType);
  const advisorRouteHint = advisorRoutesThroughProtocol
    ? "Advisor travel skips Lead Executive Office and starts at Protocol for Clearance."
    : `Advisor travel is routed directly to the ${selectedOwnerLabel}.`;

  const normalizedPhone = normalizePhonePreview(formData.phone);

  const normalizeComparable = useCallback(
    (value) => String(value || "").trim().toLowerCase(),
    []
  );

  const assignedSector = String(currentUser?.sector || "").trim();
  const assignedLeadExecutiveOffice = String(currentUser?.department || "").trim();
  const isStateMinisterSectorTraveler =
    currentUser?.role === "state_minister" &&
    formData.workflowType === "sector_structure";
  const isAdvisorTraveler = isMoA && formData.travelerType === "advisor";
  const isProjectTraveler = isMoA && formData.travelerType === "project";
  const isProjectCoordinatorOwnProject =
    currentUser?.role === "project_coordinator" &&
    isProjectTraveler &&
    normalizeComparable(currentUser?.sector) ===
      normalizeComparable(formData.sector) &&
    normalizeComparable(currentUser?.department) ===
      normalizeComparable(formData.leadExecutiveOffice);
  const isAffiliateDirectorGeneralTraveler =
    ["director_general", "office_head"].includes(currentUser?.role) &&
    isAffiliate &&
    normalizeComparable(currentUser?.sector) ===
      normalizeComparable(formData.organizationName);
  const displayedWorkflowPath = isProjectTraveler
    ? isProjectCoordinatorOwnProject && formData.workflowType === "sector_structure"
      ? [
          "Project Coordinator",
          "State Minister",
          "Protocol for Clearance",
          "Office Head",
          "Minister",
          "Protocol PM Submission",
          "PM Office",
        ]
      : isProjectCoordinatorOwnProject && formData.workflowType === "ceo_structure"
      ? [
          "Project Coordinator",
          "CEO",
          "Protocol for Clearance",
          "Office Head",
          "Minister",
          "Protocol PM Submission",
          "PM Office",
        ]
      : isProjectCoordinatorOwnProject
      ? [
          "Project Coordinator",
          "Protocol for Clearance",
          "Office Head",
          "Protocol PM Submission",
          "PM Office",
        ]
      : formData.workflowType === "sector_structure"
      ? [
          "Project Staff",
          "Project Coordinator",
          "State Minister",
          "Protocol for Clearance",
          "Office Head",
          "Minister",
          "Protocol PM Submission",
          "PM Office",
        ]
      : formData.workflowType === "ceo_structure"
      ? [
          "Project Staff",
          "Project Coordinator",
          "CEO",
          "Protocol for Clearance",
          "Office Head",
          "Minister",
          "Protocol PM Submission",
          "PM Office",
        ]
      : [
          "Project Staff",
          "Project Coordinator",
          "Protocol for Clearance",
          "Office Head",
          "Protocol PM Submission",
          "PM Office",
        ]
    : isAdvisorTraveler
    ? formData.workflowType === "sector_structure"
      ? [
          "Advisor",
          "State Minister",
          "Protocol for Clearance",
          "Office Head",
          "Minister",
          "Protocol PM Submission",
          "PM Office",
        ]
      : formData.workflowType === "ceo_structure"
      ? [
          "Advisor",
          "CEO",
          "Protocol for Clearance",
          "Office Head",
          "Minister",
          "Protocol PM Submission",
          "PM Office",
        ]
      : formData.workflowType === "minister_structure"
      ? [
          "Advisor",
          "Protocol for Clearance",
          "Office Head",
          "Protocol PM Submission",
          "PM Office",
        ]
      : [
          "Advisor",
          "Protocol for Clearance",
          "Office Head",
          "Protocol PM Submission",
          "PM Office",
        ]
    : isStateMinisterSectorTraveler
    ? [
        "State Minister",
        "Protocol for Clearance",
        "Office Head",
        "Minister",
        "Protocol PM Submission",
        "PM Office",
      ]
    : workflowPath[formData.workflowType] || [];

  const sectorOptions = useMemo(
    () =>
      moaSectors
        .filter((sector) => sector.workflow_type === formData.workflowType)
        .filter((sector) => {
          if (!assignedSector) return true;
          return normalizeComparable(sector.name) === normalizeComparable(assignedSector);
        }),
    [assignedSector, formData.workflowType, moaSectors, normalizeComparable]
  );

  const leadExecutiveOfficeOptions = useMemo(
    () =>
      leadExecutiveOffices
        .filter((office) => office.sector_name === formData.sector)
        .filter((office) => {
          if (!assignedLeadExecutiveOffice) return true;
          return normalizeComparable(office.name) === normalizeComparable(assignedLeadExecutiveOffice);
        }),
    [assignedLeadExecutiveOffice, formData.sector, leadExecutiveOffices, normalizeComparable]
  );

  const projectOptions = useMemo(
    () =>
      moaProjects
        .filter((project) => project.parent_structure_name === formData.sector)
        .filter((project) => {
          if (!assignedLeadExecutiveOffice) return true;
          return normalizeComparable(project.project_name) === normalizeComparable(assignedLeadExecutiveOffice);
        }),
    [assignedLeadExecutiveOffice, formData.sector, moaProjects, normalizeComparable]
  );

  const hasAssignedSectorOption = Boolean(assignedSector && sectorOptions.length === 1);
  const hasAssignedLeadExecutiveOfficeOption = Boolean(
    assignedLeadExecutiveOffice && leadExecutiveOfficeOptions.length === 1
  );
  const hasAssignedProjectOption = Boolean(
    assignedLeadExecutiveOffice && projectOptions.length === 1
  );

  const markTouched = (name) => setTouched((p) => ({ ...p, [name]: true }));

  const touchMany = (names) =>
    setTouched((p) => {
      const next = { ...p };
      names.forEach((k) => {
        next[k] = true;
      });
      return next;
    });

  const handleChange = (nameOrEvent, directValue) => {
    let name;
    let value;

    if (typeof nameOrEvent === "string") {
      name = nameOrEvent;
      value = directValue;
    } else {
      name = nameOrEvent?.target?.name;
      value = nameOrEvent?.target?.value;
    }

    if (!name) return;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "startDate" && next.endDate && next.endDate < value) {
        next.endDate = "";
      }

      if (name === "organizationType") {
        next.travelerType = "";
        next.workflowType = "";
        next.sector = "";
        next.leadExecutiveOffice = "";
        next.organizationName = "";
      }

      if (name === "travelerType") {
        next.workflowType = "";
        next.sector = "";
        next.leadExecutiveOffice = "";
      }

      if (name === "workflowType") {
        next.sector = "";
        next.leadExecutiveOffice = "";
      }

      if (name === "sector") {
        next.leadExecutiveOffice = "";
      }

      return next;
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((p) => ({ ...p, [name]: files?.[0] || null }));
  };

  const errors = useMemo(() => {
    const e = {};

    if (!formData.organizationType) e.organizationType = "Select an organization type.";

    if (isMoA) {
      if (!formData.travelerType) e.travelerType = "Select traveler type.";
      if (!formData.workflowType) e.workflowType = "Select the MoA structure type.";
      if (!formData.sector.trim()) e.sector = "MoA Structure is required.";
      if (!isStateMinisterSectorTraveler && !isAdvisorTraveler && !formData.leadExecutiveOffice.trim()) {
        e.leadExecutiveOffice = isProjectTraveler
          ? "Project / Coordinator Office is required."
          : "Lead Executive Office is required.";
      }
    }

    if (isAffiliate && !formData.organizationName) {
      e.organizationName = "Select an affiliate institution.";
    }

    if (!formData.fullName.trim()) e.fullName = "Full name is required.";
    if (!formData.position.trim()) e.position = "Position is required.";
    if (!isAffiliateDirectorGeneralTraveler && !formData.department.trim()) {
      e.department = "Department is required.";
    }

    const email = (formData.email || "").trim();
    if (!email) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email.";

    const phone = (formData.phone || "").trim();
    if (phone && !/^(?:\+251[97]\d{8}|0[97]\d{8}|[97]\d{8})$/.test(phone.replace(/\s+/g, ""))) {
      e.phone = "Use 09..., 9..., 07..., 7..., +251 9..., or +251 7...";
    }

    if (!formData.country.trim()) e.country = "Destination country is required.";
    if (!formData.startDate) e.startDate = "Start date is required.";
    if (!formData.endDate) e.endDate = "End date is required.";
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      e.endDate = "End date must be on or after start date.";
    }
    if (!formData.purpose.trim()) e.purpose = "Purpose is required.";

    return e;
  }, [
    formData,
    isMoA,
    isAffiliate,
    isStateMinisterSectorTraveler,
    isAdvisorTraveler,
    isProjectTraveler,
    isAffiliateDirectorGeneralTraveler,
  ]);

  const step1Valid = ![
    "organizationType",
    "travelerType",
    "workflowType",
    "sector",
    "leadExecutiveOffice",
    "organizationName",
    "fullName",
    "position",
    "department",
    "email",
    "phone",
  ].some((k) => {
    if (isAffiliate && ["travelerType", "workflowType", "sector", "leadExecutiveOffice"].includes(k)) return false;
    if (isAffiliateDirectorGeneralTraveler && k === "department") return false;
    if (isStateMinisterSectorTraveler && k === "leadExecutiveOffice") return false;
    if (isAdvisorTraveler && k === "leadExecutiveOffice") return false;
    if (isMoA && k === "organizationName") return false;
    if (
      !formData.organizationType &&
      ["travelerType", "workflowType", "sector", "leadExecutiveOffice", "organizationName"].includes(k)
    ) {
      return false;
    }
    return Boolean(errors[k]);
  });

  const step2Valid = !["country", "startDate", "endDate", "purpose"].some((k) => errors[k]);
  const canSubmit = step1Valid && step2Valid;

  const fetchOrganizations = useCallback(async () => {
    setLoading((p) => ({ ...p, organizations: true }));
    try {
      const res = await API.get("/affiliate-institutions");
      setOrganizations(res.data || []);
    } catch {
      setNotice({ type: "error", message: "Unable to load affiliate institutions." });
    } finally {
      setLoading((p) => ({ ...p, organizations: false }));
    }
  }, []);

  const fetchMoaSectors = useCallback(async () => {
    setLoading((p) => ({ ...p, moaSectors: true }));
    try {
      const res = await API.get("/moa-sectors");
      setMoaSectors(res.data || []);
    } catch {
      setNotice({ type: "error", message: "Unable to load MoA sectors." });
    } finally {
      setLoading((p) => ({ ...p, moaSectors: false }));
    }
  }, []);

  const fetchLeadExecutiveOffices = useCallback(async () => {
    setLoading((p) => ({ ...p, leadExecutiveOffices: true }));
    try {
      const res = await API.get("/moa-executive-offices");
      setLeadExecutiveOffices(res.data || []);
    } catch {
      setNotice({ type: "error", message: "Unable to load Lead Executive Offices." });
    } finally {
      setLoading((p) => ({ ...p, leadExecutiveOffices: false }));
    }
  }, []);

  const fetchMoaProjects = useCallback(async () => {
    setLoading((p) => ({ ...p, moaProjects: true }));
    try {
      const res = await API.get("/moa-projects");
      setMoaProjects(res.data || []);
    } catch {
      setNotice({ type: "error", message: "Unable to load MoA projects." });
    } finally {
      setLoading((p) => ({ ...p, moaProjects: false }));
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    setLoading((p) => ({ ...p, countries: true }));
    try {
      const res = await fetch("https://restcountries.com/v3.1/all?fields=name");
      if (!res.ok) throw new Error("Country service unavailable");

      const data = await res.json();
      const countryNames = (data || [])
          .map((c) => c?.name?.common)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

      setCountries(countryNames.length ? countryNames : fallbackCountries);
    } catch {
      setCountries(fallbackCountries);
    } finally {
      setLoading((p) => ({ ...p, countries: false }));
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
    fetchCountries();
    fetchMoaSectors();
    fetchLeadExecutiveOffices();
    fetchMoaProjects();
  }, [fetchOrganizations, fetchCountries, fetchMoaSectors, fetchLeadExecutiveOffices, fetchMoaProjects]);

  useEffect(() => {
    if (!isMoA || !formData.workflowType || !sectorOptions.length) return;

    const assignedOption = assignedSector
      ? sectorOptions.find(
          (sector) =>
            normalizeComparable(sector.name) === normalizeComparable(assignedSector)
        )
      : null;

    const nextSector = assignedOption?.name || (sectorOptions.length === 1 ? sectorOptions[0].name : "");

    if (nextSector && formData.sector !== nextSector) {
      setFormData((prev) => ({
        ...prev,
        sector: nextSector,
        leadExecutiveOffice:
          prev.sector === nextSector ? prev.leadExecutiveOffice : "",
      }));
    }
  }, [
    assignedSector,
    formData.sector,
    formData.workflowType,
    isMoA,
    normalizeComparable,
    sectorOptions,
  ]);

  useEffect(() => {
    if (!isProjectTraveler || !formData.sector || !projectOptions.length) return;

    const nextProject =
      projectOptions.length === 1 ? projectOptions[0].project_name : "";

    if (nextProject && formData.leadExecutiveOffice !== nextProject) {
      setFormData((prev) => ({
        ...prev,
        leadExecutiveOffice: nextProject,
      }));
    }
  }, [
    formData.leadExecutiveOffice,
    formData.sector,
    isProjectTraveler,
    projectOptions,
  ]);

  useEffect(() => {
    if (!isMoA || !formData.sector || !leadExecutiveOfficeOptions.length) return;

    const assignedOption = assignedLeadExecutiveOffice
      ? leadExecutiveOfficeOptions.find(
          (office) =>
            normalizeComparable(office.name) ===
            normalizeComparable(assignedLeadExecutiveOffice)
        )
      : null;

    const nextOffice =
      assignedOption?.name ||
      (leadExecutiveOfficeOptions.length === 1 ? leadExecutiveOfficeOptions[0].name : "");

    if (nextOffice && formData.leadExecutiveOffice !== nextOffice) {
      setFormData((prev) => ({
        ...prev,
        leadExecutiveOffice: nextOffice,
      }));
    }
  }, [
    assignedLeadExecutiveOffice,
    formData.leadExecutiveOffice,
    formData.sector,
    isMoA,
    leadExecutiveOfficeOptions,
    normalizeComparable,
  ]);

  const goNext = () => {
    setNotice({ type: "", message: "" });

    if (step === 1) {
      touchMany([
        "organizationType",
        "fullName",
        "position",
        "department",
        "email",
        ...(isMoA
          ? [
              "travelerType",
              "workflowType",
              "sector",
              ...(isAdvisorTraveler ? [] : ["leadExecutiveOffice"]),
            ]
          : []),
        ...(isAffiliate ? ["organizationName"] : []),
      ]);

      if (!step1Valid) {
        setNotice({ type: "error", message: "Please complete all required fields." });
        return;
      }
    }

    if (step === 2) {
      touchMany(["country", "startDate", "endDate", "purpose"]);

      if (!step2Valid) {
        setNotice({ type: "error", message: "Please fix the highlighted fields." });
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

  const submitRequest = async () => {
    if (submitInFlightRef.current || loading.submitting) {
      return;
    }

    setNotice({ type: "", message: "" });
    touchMany([
      "organizationType",
      "travelerType",
      "workflowType",
      "organizationName",
      "fullName",
      "position",
      "department",
      "sector",
      "leadExecutiveOffice",
      "email",
      "phone",
      "country",
      "startDate",
      "endDate",
      "purpose",
    ]);

    if (!canSubmit) {
      setNotice({ type: "error", message: "Please complete all required fields." });
      return;
    }

    submitInFlightRef.current = true;
    setLoading((p) => ({ ...p, submitting: true }));
    try {
      const data = new FormData();

      data.append("travelerCategory", isAffiliate ? "affiliate_institution" : formData.travelerType);
      data.append("workflowType", isMoA ? formData.workflowType : "office_head_structure");
      data.append("organizationName", isAffiliate ? formData.organizationName : "MoA");
      data.append(
        "department",
        isMoA
          ? isAdvisorTraveler
            ? "Advisor"
            : isStateMinisterSectorTraveler
            ? "State Minister"
            : formData.leadExecutiveOffice
          : isAffiliateDirectorGeneralTraveler
          ? "Director General"
          : formData.department
      );

      [
        "fullName",
        "position",
        "sector",
        "email",
        "phone",
        "country",
        "startDate",
        "endDate",
        "purpose",
        "sponsor",
        "passportNumber",
      ].forEach((k) => {
        if (formData[k]) {
          data.append(k, k === "phone" ? normalizedPhone : formData[k]);
        }
      });

      ["passportFile", "invitationLetter", "torFile"].forEach((k) => {
        if (formData[k]) data.append(k, formData[k]);
      });

      const created = (await API.post("/requests", data)).data;

      if (created?.id) {
        await API.put(`/requests/${created.id}/status`, {
          action: "submit",
          role: currentUser.role || "traveler",
          actorEmail: currentUser.email || formData.email,
          actorId: currentUser.id || null,
          comment: "Request prepared and submitted by Expert.",
        });
      }

      setNotice({
        type: "success",
        message: "Travel request submitted and routed to the next approver.",
      });
      setSuccessDialogOpen(true);
      resetForm({ keepNotice: true });
    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Error submitting request.";
      setNotice({ type: "error", message: typeof msg === "string" ? msg : "Error submitting request." });
    } finally {
      submitInFlightRef.current = false;
      setLoading((p) => ({ ...p, submitting: false }));
    }
  };

  return (
    <div className="ministry-page min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="request-hero">
          <div className="header-strip w-24 mb-3" />
          <div className="request-hero-content">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">New Travel Request</h1>
              <p className="mt-2 text-sm text-slate-600">
                Prepare the traveler profile, trip plan, and optional supporting documents for approval routing.
              </p>
            </div>
            <div className="request-hero-badge">
              <span>FTMS</span>
              <strong>Foreign Travel</strong>
            </div>
          </div>
        </div>

        {notice.message && (
          <div className={`mb-6 ${notice.type === "success" ? "notice-success" : "notice-error"}`}>
            {notice.message}
          </div>
        )}

        {successDialogOpen && (
          <div className="modal-overlay">
            <div className="modal-content request-success-modal">
              <h2>Travel Request Submitted</h2>
              <p>
                Your travel request has been routed to the next approver.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setSuccessDialogOpen(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <form className="ministry-card p-6 md:p-8" onSubmit={(e) => e.preventDefault()}>
          <div className="request-context-grid">
            <div>
              <span>Assigned Structure</span>
              <strong title={currentUser.sector || "Not assigned"}>
                {currentUser.sector || "Not assigned"}
              </strong>
            </div>
            <div>
              <span>Lead Executive Office</span>
              <strong title={currentUser.department || "Not assigned"}>
                {currentUser.department || "Not assigned"}
              </strong>
            </div>
            <div>
              <span>Current Step</span>
              <strong>
                {step === 1 ? "Traveler Information" : step === 2 ? "Trip Details" : "Attachments and Review"}
              </strong>
            </div>
          </div>

          <StepIndicator step={step} setStep={setStep} step1Valid={step1Valid} step2Valid={step2Valid} />

          {step === 1 && (
            <div className="space-y-7">
              <div>
                <SectionHeader
                  eyebrow="Step 1"
                  title="Traveler Information"
                  subtitle="Select the traveler source, then complete the structure and contact details."
                />
                <ChoicePanel
                  title="Request Source"
                  description="Choose where the traveler belongs before selecting the approval path."
                >
                  <Field name="organizationType" label="Organization Type" required touched={touched} errors={errors}>
                    <RadioCards
                      name="organizationType"
                      value={formData.organizationType}
                      onChange={handleChange}
                      cols={2}
                      options={[
                        {
                          value: "moa",
                          label: "Ministry of Agriculture",
                          description: "Sector, CEO, Office Head, or Minister structure",
                        },
                        {
                          value: "affiliate",
                          label: "Affiliate Institute",
                          description: "Starts with Director General review",
                        },
                      ]}
                    />
                  </Field>
                </ChoicePanel>
              </div>

              {isMoA && (
                <>
                  <ChoicePanel
                    title="Traveler Role"
                    description="This determines whether Lead Executive Office selection is required."
                  >
                    <Field name="travelerType" label="Traveler Type" required touched={touched} errors={errors}>
                      <RadioCards
                        name="travelerType"
                        value={formData.travelerType}
                        onChange={handleChange}
                        cols={3}
                        options={travelerTypeOptions}
                      />
                    </Field>
                  </ChoicePanel>

                  {formData.travelerType && (
                    <ChoicePanel
                      title="MoA Structure"
                      description="Select the leadership structure that owns this travel request."
                    >
                      <Field
                        name="workflowType"
                        label="Structure Category"
                        required
                        touched={touched}
                        errors={errors}
                        hint="Select the category registered in Organization Settings."
                      >
                        <RadioCards
                          name="workflowType"
                          value={formData.workflowType}
                          onChange={handleChange}
                          cols={4}
                          options={workflowOptions}
                        />
                      </Field>
                    </ChoicePanel>
                  )}

                  {formData.workflowType && (
                    <ChoicePanel
                      title={isAdvisorTraveler ? "Advisor Routing" : "Structure Assignment"}
                      description={
                        isAdvisorTraveler
                          ? "Advisors skip Lead Executive Office selection."
                          : isProjectTraveler
                          ? "Select the accountable structure and enter the project coordinator office."
                          : "Select the exact structure and Lead Executive Office for routing."
                      }
                    >
                      <div className="workflow-preview">
                        <span>Approval Workflow</span>
                        <div className="workflow-preview-path">
                          {displayedWorkflowPath.map((stage, index) => (
                            <span key={`${stage}-${index}`}>{stage}</span>
                          ))}
                        </div>
                        <small>
                          {isStateMinisterSectorTraveler
                            ? "State Minister self-approval is skipped and the request continues to the next stage."
                            : `${selectedOwnerLabel} decides this structure before the next workflow stage.`}
                        </small>
                      </div>

                    <div>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Field
                          name="sector"
                          label={`${selectedStructureTypeLabel} Structure`}
                          required
                          touched={touched}
                          errors={errors}
                          hint={`Only ${selectedStructureTypeLabel} structures registered in Settings are shown.`}
                        >
                          <select
                            name="sector"
                            value={formData.sector}
                            onChange={handleChange}
                            onBlur={() => markTouched("sector")}
                            className="ministry-input"
                            disabled={loading.moaSectors || hasAssignedSectorOption}
                          >
                            <option value="">
                              {loading.moaSectors
                                ? "Loading MoA structures..."
                                : assignedSector && !sectorOptions.length
                                ? "No matching assigned structure found"
                                : `Select ${selectedStructureTypeLabel} Structure`}
                            </option>
                            {sectorOptions.map((sector) => (
                              <option key={sector.id || sector.name} value={sector.name}>
                                {sector.name}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field
                          name="leadExecutiveOffice"
                          label={
                            isAdvisorTraveler
                              ? "Advisor Routing"
                              : isProjectTraveler
                              ? "Project / Coordinator Office"
                              : isStateMinisterSectorTraveler
                              ? "Approver Level"
                              : "Lead Executive Office"
                          }
                          required={!isStateMinisterSectorTraveler && !isAdvisorTraveler}
                          touched={touched}
                          errors={errors}
                          hint={
                            isAdvisorTraveler
                              ? advisorRouteHint
                              : isProjectTraveler
                              ? `Enter the project or coordinator office accountable to the selected ${selectedStructureTypeLabel} structure.`
                              : isStateMinisterSectorTraveler
                              ? "State Minister travelers are routed directly to the next formal approver."
                              : `Select the Lead Executive Office under the selected ${selectedStructureTypeLabel} structure.`
                          }
                        >
                          {isAdvisorTraveler ? (
                            <input
                              className="ministry-input"
                              value={
                                advisorRoutesThroughProtocol
                                  ? "Advisor via Protocol for Clearance"
                                  : `Advisor to ${selectedOwnerLabel}`
                              }
                              disabled
                              readOnly
                            />
                          ) : isProjectTraveler ? (
                            <select
                              name="leadExecutiveOffice"
                              value={formData.leadExecutiveOffice}
                              onChange={handleChange}
                              onBlur={() => markTouched("leadExecutiveOffice")}
                              className="ministry-input"
                              disabled={
                                !formData.sector ||
                                loading.moaProjects ||
                                hasAssignedProjectOption
                              }
                            >
                              <option value="">
                                {!formData.sector
                                  ? `Select ${selectedStructureTypeLabel} Structure first`
                                  : loading.moaProjects
                                  ? "Loading projects..."
                                  : "Select Project"}
                              </option>
                              {projectOptions.map((project) => (
                                <option key={project.id} value={project.project_name}>
                                  {project.project_name}
                                </option>
                              ))}
                            </select>
                          ) : isStateMinisterSectorTraveler ? (
                            <input
                              className="ministry-input"
                              value="State Minister"
                              disabled
                              readOnly
                            />
                          ) : (
                            <select
                              name="leadExecutiveOffice"
                              value={formData.leadExecutiveOffice}
                              onChange={handleChange}
                              onBlur={() => markTouched("leadExecutiveOffice")}
                              className="ministry-input"
                              disabled={
                                !formData.sector ||
                                loading.leadExecutiveOffices ||
                                hasAssignedLeadExecutiveOfficeOption
                              }
                            >
                              <option value="">
                                {!formData.sector
                                  ? `Select ${selectedStructureTypeLabel} Structure first`
                                  : loading.leadExecutiveOffices
                                  ? "Loading Lead Executive Offices..."
                                  : assignedLeadExecutiveOffice && !leadExecutiveOfficeOptions.length
                                  ? "No matching assigned office found"
                                  : "Select Lead Executive Office"}
                              </option>
                              {leadExecutiveOfficeOptions.map((office) => (
                                <option key={office.id || office.name} value={office.name}>
                                  {office.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </Field>
                      </div>
                    </div>
                    </ChoicePanel>
                  )}
                </>
              )}

              {isAffiliate && (
                <ChoicePanel
                  title="Affiliate Institution"
                  description="The Director General registered for this affiliate is the first approver."
                >
                  <div className="workflow-preview">
                    <span>Approval Workflow</span>
                    <div className="workflow-preview-path">
                      {workflowPath.affiliate_institution.map((stage, index) => (
                        <span key={`${stage}-${index}`}>{stage}</span>
                      ))}
                    </div>
                    <small>
                      Affiliate Institute requests are first reviewed by the
                      Director General, then continue through the formal route.
                    </small>
                  </div>
                  <Field name="organizationName" label="Affiliate Institution" required touched={touched} errors={errors}>
                    <select
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      onBlur={() => markTouched("organizationName")}
                      className="ministry-input"
                    >
                      <option value="">{loading.organizations ? "Loading..." : "Select Affiliate Institution"}</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.organization_name}>
                          {org.organization_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </ChoicePanel>
              )}

              {formData.organizationType && (
                <div>
                  <Divider label="Traveler Details" />
                  <div className="traveler-split-grid">
                    <div className="traveler-detail-panel">
                      <div className="traveler-detail-heading">
                        <span>Personal and Job Details</span>
                        <small>Name, title, and requesting office/unit</small>
                      </div>

                      <Field name="fullName" label="Full Name" required touched={touched} errors={errors}>
                        <input
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          onBlur={() => markTouched("fullName")}
                          className="ministry-input"
                        />
                      </Field>

                      <Field name="position" label="Position / Title" required touched={touched} errors={errors}>
                        <input
                          name="position"
                          value={formData.position}
                          onChange={handleChange}
                          onBlur={() => markTouched("position")}
                          className="ministry-input"
                        />
                      </Field>

                      <Field
                        name="department"
                        label={
                          isAffiliateDirectorGeneralTraveler
                            ? "Approver Level"
                            : isMoA
                            ? "Requester Department / Unit"
                            : "Department"
                        }
                        required={!isAffiliateDirectorGeneralTraveler}
                        touched={touched}
                        errors={errors}
                      >
                        {isAffiliateDirectorGeneralTraveler ? (
                          <input
                            className="ministry-input"
                            value="Director General"
                            disabled
                            readOnly
                          />
                        ) : (
                          <input
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            onBlur={() => markTouched("department")}
                            className="ministry-input"
                          />
                        )}
                      </Field>
                    </div>

                    <div className="traveler-detail-panel">
                      <div className="traveler-detail-heading">
                        <span>Contact Details</span>
                        <small>Email is required; phone is optional</small>
                      </div>

                      <Field name="email" label="Email Address" required touched={touched} errors={errors}>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={() => markTouched("email")}
                          className="ministry-input"
                        />
                      </Field>

                      <Field
                        name="phone"
                        label="Phone Number"
                        hint={
                          normalizedPhone
                            ? `Will be saved as ${normalizedPhone}`
                            : "Optional. Accepted: 09..., 9..., 07..., 7..., +251 9..., +251 7..."
                        }
                        touched={touched}
                        errors={errors}
                      >
                        <input
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          onBlur={() => markTouched("phone")}
                          className="ministry-input"
                          placeholder="09..."
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <SectionHeader
                  eyebrow="Step 2"
                  title="Trip Details"
                  subtitle="Add destination, travel dates, sponsor, passport reference, and purpose."
                />
              </div>

              {tripDuration && (
                <div className="trip-duration-card">
                  <span>Calculated Travel Period</span>
                  <strong>
                    {tripDuration} day{tripDuration === 1 ? "" : "s"}
                  </strong>
                  <small>From {formData.startDate} to {formData.endDate}</small>
                </div>
              )}

              <div className="trip-details-panels">
                <div className="trip-detail-panel">
                  <div className="traveler-detail-heading">
                    <span>Destination and Travel Dates</span>
                    <small>Country, start date, and end date</small>
                  </div>

                  <Field name="country" label="Destination Country" required touched={touched} errors={errors}>
                    <input
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      onBlur={() => markTouched("country")}
                      list="countries-list"
                      className="ministry-input"
                      disabled={loading.countries}
                      placeholder={loading.countries ? "Loading countries..." : "Start typing a country"}
                    />
                    <datalist id="countries-list">
                      {countries.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </Field>

                  <div className="date-range-grid">
                    <Field name="startDate" label="Start Date" required touched={touched} errors={errors}>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        onBlur={() => markTouched("startDate")}
                        className="ministry-input"
                      />
                    </Field>

                    <Field
                      name="endDate"
                      label="End Date"
                      required
                      hint="Must be on or after the start date."
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
                      />
                    </Field>
                  </div>
                </div>

                <div className="trip-detail-panel">
                  <div className="traveler-detail-heading">
                    <span>Travel Support and Purpose</span>
                    <small>Sponsor, passport, and purpose of travel</small>
                  </div>

                  <div className="trip-support-grid">
                    <Field name="sponsor" label="Sponsor / Funding Source" hint="Optional" touched={touched} errors={errors}>
                      <input name="sponsor" value={formData.sponsor} onChange={handleChange} className="ministry-input" />
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

                  <Field name="purpose" label="Purpose of Travel" required touched={touched} errors={errors}>
                    <textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      onBlur={() => markTouched("purpose")}
                      rows={5}
                      className="ministry-input"
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div>
                <SectionHeader
                  eyebrow="Step 3"
                  title="Attachments and Review"
                  subtitle="Attach available documents, confirm the summary, then submit the request."
                />
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
                <div className="review-box-title">Request Summary</div>
                <div className="review-grid">
                  <div>
                    <span>Organization</span>
                    <strong>{isMoA ? "Ministry of Agriculture" : formData.organizationName || "-"}</strong>
                  </div>
                  <div>
                    <span>Traveler</span>
                    <strong>{formData.fullName || "-"} - {formData.position || "-"}</strong>
                  </div>
                  {isMoA && (
                    <div>
                      <span>Traveler Type</span>
                      <strong>{travelerTypeOptions.find((t) => t.value === formData.travelerType)?.label || "-"}</strong>
                    </div>
                  )}
                  {isMoA && (
                    <div>
                      <span>MoA Structure</span>
                      <strong>
                        {selectedWorkflow?.label || "-"}: {formData.sector || "-"}
                      </strong>
                    </div>
                  )}
                  {isMoA && (
                    <div>
                      <span>
                        {isStateMinisterSectorTraveler
                          ? "Approver Level"
                          : "Lead Executive Office"}
                      </span>
                      <strong>
                        {isStateMinisterSectorTraveler
                          ? "State Minister"
                          : formData.leadExecutiveOffice || "-"}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span>Destination</span>
                    <strong>{formData.country || "-"}</strong>
                  </div>
                  <div>
                    <span>Travel Dates</span>
                    <strong>
                      {formData.startDate || "-"} to {formData.endDate || "-"}
                    </strong>
                  </div>
                </div>
                {isMoA && selectedWorkflow && (
                  <div className="review-route">
                    <span>Approval route</span>
                    <strong>{displayedWorkflowPath.join(" -> ")}</strong>
                  </div>
                )}
                {isAffiliate && (
                  <div className="review-route">
                    <span>Approval route</span>
                    <strong>{workflowPath.affiliate_institution.join(" -> ")}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

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
                <button type="button" onClick={goNext} className="primary-btn">
                  Continue
                </button>
              ) : (
                <button type="button" onClick={submitRequest} className="primary-btn" disabled={loading.submitting}>
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
