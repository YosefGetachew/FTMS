import { Fragment, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "./Settings.css";

function Settings() {
  const sectorApproverRoles = useMemo(
    () => [
      {
        value: "state_minister",
        label: "State Minister",
        group: "State Ministers",
      },
      {
        value: "lead_executive_officer",
        label: "Lead Executive Officer",
        group: "Lead Executive Officers",
      },
      {
        value: "project_coordinator",
        label: "Project Coordinator",
        group: "Projects",
      },
      {
        value: "chief_executive_officer",
        label: "CEO",
        group: "CEO",
      },
      {
        value: "director_general",
        label: "Director General",
        group: "Affiliate Institutes",
      },
      {
        value: "office_head",
        label: "Head of the Minister's Office",
        group: "Head of the Minister's Office",
      },
      {
        value: "protocol",
        label: "Protocol",
        group: "Protocol",
      },
      {
        value: "pm_office",
        label: "PM Office",
        group: "PM Office",
      },
      {
        value: "minister",
        label: "Minister",
        group: "Minister",
      },
    ],
    []
  );

  const workflowTypes = useMemo(
    () => [
      {
        value: "sector_structure",
        label: "Sector",
      },
      {
        value: "ceo_structure",
        label: "CEO",
      },
      {
        value: "office_head_structure",
        label: "Head of the Minister's Office",
      },
      {
        value: "minister_structure",
        label: "Minister",
      },
    ],
    []
  );

  const approverAreaTypes = useMemo(
    () => [
      ...workflowTypes,
      {
        value: "affiliate_structure",
        label: "Affiliate Institute",
      },
    ],
    [workflowTypes]
  );

  const parentRoles = useMemo(
    () => [
      "state_minister",
      "chief_executive_officer",
      "ceo",
      "office_head",
      "minister",
    ],
    []
  );

  const [affiliateInstitutions, setAffiliateInstitutions] = useState([]);
  const [moaProjects, setMoaProjects] = useState([]);
  const [sectorApprovers, setSectorApprovers] = useState([]);

  const [moaSectors, setMoaSectors] = useState([]);
  const [executiveOffices, setExecutiveOffices] = useState([]);

  const [organizationName, setOrganizationName] = useState("");
  const [generalDirectorName, setGeneralDirectorName] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [organizationPhone, setOrganizationPhone] = useState("");
  const [generalDirectorPassword, setGeneralDirectorPassword] = useState("");

  const [sectorName, setSectorName] = useState("");
  const [sectorWorkflowType, setSectorWorkflowType] =
    useState("sector_structure");

  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [executiveOfficeStructureType, setExecutiveOfficeStructureType] =
    useState("sector_structure");
  const [executiveOfficeName, setExecutiveOfficeName] = useState("");

  const [projectStructureType, setProjectStructureType] =
    useState("sector_structure");
  const [projectParentStructureId, setProjectParentStructureId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectCoordinatorName, setProjectCoordinatorName] = useState("");
  const [projectCoordinatorEmail, setProjectCoordinatorEmail] = useState("");
  const [projectCoordinatorPhone, setProjectCoordinatorPhone] = useState("");
  const [projectCoordinatorPassword, setProjectCoordinatorPassword] =
    useState("");

  const [sector, setSector] = useState("");
  const [approverOffice, setApproverOffice] = useState("");
  const [approverStructureType, setApproverStructureType] =
    useState("sector_structure");

  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [approverPassword, setApproverPassword] = useState("");
  const [approverRole, setApproverRole] = useState("state_minister");

  const [editingOrganization, setEditingOrganization] = useState(null);
  const [editingSector, setEditingSector] = useState(null);
  const [editingExecutiveOffice, setEditingExecutiveOffice] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingApprover, setEditingApprover] = useState(null);
  const [inheritanceFilter, setInheritanceFilter] = useState("");
  const [executiveOfficeFilter, setExecutiveOfficeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [approverListFilter, setApproverListFilter] = useState("");
  const [activeSettingsSection, setActiveSettingsSection] = useState("structures");

  const isParentRole = parentRoles.includes(approverRole);

  const stateMinisters = sectorApprovers.filter(
    (user) => user.role === "state_minister"
  );

  const ceos = sectorApprovers.filter((user) =>
    ["chief_executive_officer", "ceo"].includes(user.role)
  );

  const officeHeads = sectorApprovers.filter(
    (user) => user.role === "office_head"
  );

  const directorGenerals = sectorApprovers.filter((user) =>
    ["director_general", "office_head"].includes(user.role)
  );

  const ministers = sectorApprovers.filter((user) => user.role === "minister");

  const leadExecutives = sectorApprovers.filter((user) =>
    ["lead_executive_officer", "lead_executive"].includes(user.role)
  );

  const projectCoordinators = sectorApprovers.filter(
    (user) => user.role === "project_coordinator"
  );

  const getOwnerForStructure = (structure) => {
    if (structure.workflow_type === "affiliate_structure") {
      return directorGenerals.find((user) => user.sector === structure.name);
    }

    if (structure.workflow_type === "sector_structure") {
      return stateMinisters.find((user) => user.sector === structure.name);
    }

    if (structure.workflow_type === "ceo_structure") {
      return ceos.find((user) => user.sector === structure.name);
    }

    if (structure.workflow_type === "office_head_structure") {
      return officeHeads.find((user) => user.sector === structure.name);
    }

    if (structure.workflow_type === "minister_structure") {
      return ministers.find((user) => user.sector === structure.name);
    }

    return null;
  };

  const getOwnerLabelForStructure = (workflowType) => {
    if (workflowType === "sector_structure") return "State Minister";
    if (workflowType === "ceo_structure") return "CEO";
    if (workflowType === "office_head_structure") {
      return "Head of the Minister's Office";
    }
    if (workflowType === "minister_structure") return "Minister";
    if (workflowType === "affiliate_structure") return "Director General";
    return "Owner";
  };

  const getLeadExecutiveOfficesForSector = (sectorName) =>
    executiveOffices.filter((office) => office.sector_name === sectorName);

  const getLeadExecutivesForOffice = (sectorName, officeName) =>
    leadExecutives.filter(
      (user) => user.sector === sectorName && user.department === officeName
    );

  const getProjectCoordinatorsForProject = (sectorName, projectName) =>
    projectCoordinators.filter(
      (user) => user.sector === sectorName && user.department === projectName
    );

  const isLeadExecutiveRole = (role) =>
    ["lead_executive_officer", "lead_executive"].includes(role);

  const isProjectCoordinatorRole = (role) => role === "project_coordinator";

  const isStructureOwnerRole = (role) =>
    ["state_minister", "chief_executive_officer", "ceo", "office_head"].includes(
      role
    );

  const getStructureLabelForApproverRole = (role) => {
    if (isLeadExecutiveRole(role) || isProjectCoordinatorRole(role)) {
      return "Parent Structure";
    }
    if (role === "director_general") return "Affiliate Institute";
    if (role === "state_minister") return "Sector";
    if (role === "chief_executive_officer" || role === "ceo") return "CEO";
    if (role === "office_head") return "Head of the Minister's Office";
    if (role === "minister") return "Minister";
    if (role === "pm_office") return "PM Office";
    return "Structure";
  };

  const getStructurePlaceholderForApproverRole = (role) =>
    `Select ${getStructureLabelForApproverRole(role)}`;

  const getStructuresForApproverRole = (role) =>
    moaSectors.filter((item) => {
      if (isLeadExecutiveRole(role) || isProjectCoordinatorRole(role)) {
        return ["sector_structure", "ceo_structure", "office_head_structure"].includes(
          item.workflow_type
        );
      }
      if (role === "state_minister") {
        return item.workflow_type === "sector_structure";
      }
      if (role === "director_general") {
        return false;
      }
      if (role === "chief_executive_officer" || role === "ceo") {
        return item.workflow_type === "ceo_structure";
      }
      if (role === "office_head") {
        return item.workflow_type === "office_head_structure";
      }
      if (role === "minister") {
        return item.workflow_type === "minister_structure";
      }
      return false;
    });

  const getApproverRolesForStructureType = (workflowType) => {
    const roleMap = {
      sector_structure: ["state_minister", "lead_executive_officer", "project_coordinator"],
      ceo_structure: ["chief_executive_officer", "lead_executive_officer", "project_coordinator"],
      office_head_structure: ["office_head", "lead_executive_officer", "project_coordinator"],
      minister_structure: ["minister", "pm_office"],
      affiliate_structure: ["director_general"],
    };

    return sectorApproverRoles.filter((role) =>
      (roleMap[workflowType] || []).includes(role.value)
    );
  };

  const getDefaultRoleForStructureType = (workflowType) => {
    if (workflowType === "sector_structure") return "state_minister";
    if (workflowType === "ceo_structure") return "chief_executive_officer";
    if (workflowType === "office_head_structure") return "office_head";
    if (workflowType === "minister_structure") return "minister";
    if (workflowType === "affiliate_structure") return "director_general";
    return "lead_executive_officer";
  };

  const getStructuresForWorkflowType = (workflowType) => {
    if (workflowType === "affiliate_structure") {
      return affiliateInstitutions.map((item) => ({
        id: `affiliate-${item.id}`,
        name: item.organization_name,
        workflow_type: "affiliate_structure",
      }));
    }

    return moaSectors.filter((item) => item.workflow_type === workflowType);
  };

  const executiveOfficeStructureTypes = workflowTypes.filter(
    (item) => item.value !== "minister_structure"
  );

  const projectStructureTypes = workflowTypes.filter(
    (item) => item.value !== "minister_structure"
  );

  const getSelectedApproverStructure = () =>
    moaSectors.find(
      (item) =>
        item.workflow_type === approverStructureType && item.name === sector
    );

  const affiliateStructures = affiliateInstitutions.map((item) => ({
    id: `affiliate-${item.id}`,
    name: item.organization_name,
    workflow_type: "affiliate_structure",
    source: "affiliate",
  }));

  const allStructures = [...moaSectors, ...affiliateStructures];

  const filteredInheritanceStructures = allStructures.filter((item) => {
    if (!inheritanceFilter) return true;
    return item.name === inheritanceFilter;
  });

  const filteredExecutiveOffices = executiveOffices.filter((office) => {
    if (!executiveOfficeFilter) return true;
    return office.sector_name === executiveOfficeFilter;
  });

  const filteredProjects = moaProjects.filter((project) => {
    if (!projectFilter) return true;
    return project.parent_structure_name === projectFilter;
  });

  const filteredApprovers = sectorApprovers.filter((approver) => {
    if (!approverListFilter) return true;
    return approver.sector === approverListFilter;
  });

  const getWorkflowTypeRank = (workflowType) => {
    const index = approverAreaTypes.findIndex((item) => item.value === workflowType);
    return index === -1 ? approverAreaTypes.length : index;
  };

  const getStructureWorkflowType = (structureName) =>
    moaSectors.find((item) => item.name === structureName)?.workflow_type ||
    (affiliateInstitutions.some((item) => item.organization_name === structureName)
      ? "affiliate_structure"
      : "");

  const sortByWorkflowBranch = (items, getWorkflowType, getName) =>
    [...items].sort((first, second) => {
      const rankDifference =
        getWorkflowTypeRank(getWorkflowType(first)) -
        getWorkflowTypeRank(getWorkflowType(second));

      if (rankDifference !== 0) return rankDifference;

      return (getName(first) || "").localeCompare(getName(second) || "");
    });

  const sortedStructureRegistryItems = sortByWorkflowBranch(
    allStructures,
    (item) => item.workflow_type,
    (item) => item.name
  );

  const sortedExecutiveOffices = sortByWorkflowBranch(
    filteredExecutiveOffices,
    (item) => item.workflow_type,
    (item) => `${item.sector_name || ""} ${item.name || ""}`
  );

  const sortedProjects = sortByWorkflowBranch(
    filteredProjects,
    (item) => item.workflow_type,
    (item) => `${item.parent_structure_name || ""} ${item.project_name || ""}`
  );

  const sortedApprovers = sortByWorkflowBranch(
    filteredApprovers,
    (item) => getStructureWorkflowType(item.sector),
    (item) => `${item.sector || ""} ${item.department || ""} ${item.full_name || ""}`
  );

  const sortedInheritanceStructures = sortByWorkflowBranch(
    filteredInheritanceStructures,
    (item) => item.workflow_type,
    (item) => item.name
  );

  const getWorkflowGroups = (items, getWorkflowType) =>
    approverAreaTypes
      .map((workflowType) => ({
        ...workflowType,
        items: items.filter((item) => getWorkflowType(item) === workflowType.value),
      }))
      .filter((group) => group.items.length > 0);

  const renderBranchHeaderRow = (label, colSpan) => (
    <tr className="settings-branch-row">
      <td colSpan={colSpan}>
        <span>{label}</span>
      </td>
    </tr>
  );

  const settingsStats = useMemo(
    () => [
      {
        label: "MoA Structures",
        value: moaSectors.length,
        helper: "Sector, CEO, office head, and minister structures",
      },
      {
        label: "Lead Executive Offices",
        value: executiveOffices.length,
        helper: "Offices assigned under parent structures",
      },
      {
        label: "Projects",
        value: moaProjects.length,
        helper: "Projects under Sector, CEO, and Office Head structures",
      },
      {
        label: "Workflow Approvers",
        value: sectorApprovers.length,
        helper: "Registered decision makers",
      },
      {
        label: "Affiliate Institutions",
        value: affiliateInstitutions.length,
        helper: "External organizations available to travelers",
      },
    ],
    [
      moaSectors.length,
      executiveOffices.length,
      moaProjects.length,
      sectorApprovers.length,
      affiliateInstitutions.length,
    ]
  );

  const settingsSections = useMemo(
    () => [
      {
        id: "structures",
        label: "1. Structures",
        helper: "Register Sector, CEO, Office Head, and Minister structures",
      },
      {
        id: "offices",
        label: "2. Lead Offices",
        helper: "Add Lead Executive Offices under each structure",
      },
      {
        id: "projects",
        label: "3. Projects",
        helper: "Register projects under MoA structures",
      },
      {
        id: "approvers",
        label: "4. Approvers",
        helper: "Assign State Ministers, CEOs, Office Heads, Lead Executives, and Project Coordinators",
      },
      {
        id: "affiliates",
        label: "5. Affiliates",
        helper: "Register affiliate institutions for travelers",
      },
      {
        id: "hierarchy",
        label: "Hierarchy View",
        helper: "Check owners, offices, and officers together",
      },
    ],
    []
  );

  useEffect(() => {
    fetchAffiliateInstitutions();
    fetchSectorApprovers();
    fetchMoaSectors();
    fetchExecutiveOffices();
    fetchMoaProjects();
  }, []);

  const formatRole = (role) => {
    const found = sectorApproverRoles.find((item) => item.value === role);

    if (found) return found.label;

    const fallbackRoles = {
      lead_executive: "Lead Executive Officer",
      project_coordinator: "Project Coordinator",
      ceo: "CEO",
      state_minister: "State Minister",
    };

    return fallbackRoles[role] || role || "-";
  };

  const formatApproverRoleForArea = (role, workflowType) => {
    if (workflowType === "affiliate_structure" && role === "office_head") {
      return "Director General";
    }

    return formatRole(role);
  };

  const formatWorkflowType = (workflowType) => {
    const found = approverAreaTypes.find((item) => item.value === workflowType);
    return found?.label || workflowType || "-";
  };

  const handleApproverRoleChange = (role) => {
    setApproverRole(role);
    setApproverOffice("");
  };

  const handleApproverStructureTypeChange = (workflowType) => {
    setApproverStructureType(workflowType);
    setSector("");
    setApproverOffice("");
    setApproverRole(getDefaultRoleForStructureType(workflowType));
  };


  const fetchAffiliateInstitutions = async () => {
    try {
      const response = await API.get("/affiliate-institutions");
      setAffiliateInstitutions(response.data || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load affiliate institutions");
    }
  };

  const fetchSectorApprovers = async () => {
    try {
      const response = await API.get("/state-ministers");
      setSectorApprovers(response.data || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load workflow approvers");
    }
  };

  const fetchMoaSectors = async () => {
    try {
      const response = await API.get("/moa-sectors");
      setMoaSectors(response.data || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load MoA structure list");
    }
  };

  const fetchExecutiveOffices = async () => {
    try {
      const response = await API.get("/moa-executive-offices");
      setExecutiveOffices(response.data || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load Executive Offices");
    }
  };

  const fetchMoaProjects = async () => {
    try {
      const response = await API.get("/moa-projects");
      setMoaProjects(response.data || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load MoA projects");
    }
  };

  const addOrganization = async () => {
    if (!organizationName.trim()) {
      alert("Organization name is required");
      return;
    }

    try {
      await API.post("/affiliate-institutions", {
        organizationName,
        generalDirectorName,
        email: organizationEmail,
        phone: organizationPhone,
        password: generalDirectorPassword,
      });

      setOrganizationName("");
      setGeneralDirectorName("");
      setOrganizationEmail("");
      setOrganizationPhone("");
      setGeneralDirectorPassword("");

      fetchAffiliateInstitutions();
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to add organization");
    }
  };

  const updateOrganization = async () => {
    if (!editingOrganization?.organization_name?.trim()) {
      alert("Organization name is required");
      return;
    }

    try {
      await API.put(`/affiliate-institutions/${editingOrganization.id}`, {
        organizationName: editingOrganization.organization_name,
        generalDirectorName: editingOrganization.general_director_name,
        email: editingOrganization.email,
        phone: editingOrganization.phone,
        password: editingOrganization.password,
      });

      setEditingOrganization(null);
      fetchAffiliateInstitutions();
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to update organization");
    }
  };

  const deleteOrganization = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this organization?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/affiliate-institutions/${id}`);
      fetchAffiliateInstitutions();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to delete organization");
    }
  };

  const addMoaSector = async () => {
    if (!sectorName.trim() || !sectorWorkflowType) {
      alert("Structure name and type are required");
      return;
    }

    try {
      await API.post("/moa-sectors", {
        name: sectorName,
        workflowType: sectorWorkflowType,
      });

      setSectorName("");
      setSectorWorkflowType("sector_structure");

      fetchMoaSectors();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to add structure");
    }
  };

  const updateMoaSector = async () => {
    if (!editingSector?.name?.trim() || !editingSector?.workflow_type) {
      alert("Structure name and type are required");
      return;
    }

    try {
      await API.put(`/moa-sectors/${editingSector.id}`, {
        name: editingSector.name,
        workflowType: editingSector.workflow_type,
      });

      setEditingSector(null);
      fetchMoaSectors();
      fetchExecutiveOffices();
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to update structure");
    }
  };

  const deleteMoaSector = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this structure? All Lead Executive Offices under it will also be deleted."
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/moa-sectors/${id}`);
      fetchMoaSectors();
      fetchExecutiveOffices();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to delete structure");
    }
  };

  const addExecutiveOffice = async () => {
    if (!selectedSectorId || !executiveOfficeName.trim()) {
      alert("Please select a parent structure and enter the Lead Executive Office name");
      return;
    }

    try {
      await API.post("/moa-executive-offices", {
        sectorId: selectedSectorId,
        name: executiveOfficeName,
      });

      setSelectedSectorId("");
      setExecutiveOfficeStructureType("sector_structure");
      setExecutiveOfficeName("");

      fetchExecutiveOffices();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to add Executive Office");
    }
  };

  const updateExecutiveOffice = async () => {
    if (
      !editingExecutiveOffice?.sector_id ||
      !editingExecutiveOffice?.name?.trim()
    ) {
      alert("Parent structure and Lead Executive Office name are required");
      return;
    }

    try {
      await API.put(`/moa-executive-offices/${editingExecutiveOffice.id}`, {
        sectorId: editingExecutiveOffice.sector_id,
        name: editingExecutiveOffice.name,
      });

      setEditingExecutiveOffice(null);
      fetchExecutiveOffices();
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to update Executive Office");
    }
  };

  const deleteExecutiveOffice = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this Executive Office?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/moa-executive-offices/${id}`);
      fetchExecutiveOffices();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to delete Executive Office");
    }
  };

  const addMoaProject = async () => {
    if (!projectParentStructureId || !projectName.trim()) {
      alert("Please select a parent structure and enter the project name");
      return;
    }

    try {
      await API.post("/moa-projects", {
        parentStructureId: projectParentStructureId,
        projectName,
        coordinatorName: projectCoordinatorName,
        email: projectCoordinatorEmail,
        phone: projectCoordinatorPhone,
        password: projectCoordinatorPassword,
      });

      setProjectStructureType("sector_structure");
      setProjectParentStructureId("");
      setProjectName("");
      setProjectCoordinatorName("");
      setProjectCoordinatorEmail("");
      setProjectCoordinatorPhone("");
      setProjectCoordinatorPassword("");

      fetchMoaProjects();
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to add project");
    }
  };

  const updateMoaProject = async () => {
    if (!editingProject?.parent_structure_id || !editingProject?.project_name?.trim()) {
      alert("Parent structure and project name are required");
      return;
    }

    try {
      await API.put(`/moa-projects/${editingProject.id}`, {
        parentStructureId: editingProject.parent_structure_id,
        projectName: editingProject.project_name,
        coordinatorName: editingProject.coordinator_name,
        email: editingProject.email,
        phone: editingProject.phone,
        password: editingProject.password,
      });

      setEditingProject(null);
      fetchMoaProjects();
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to update project");
    }
  };

  const deleteMoaProject = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/moa-projects/${id}`);
      fetchMoaProjects();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to delete project");
    }
  };

  const addSectorApprover = async () => {
    if (
      !approverName.trim() ||
      !approverEmail.trim() ||
      !approverPassword.trim() ||
      !approverRole
    ) {
      alert("Full name, email, password, and role are required");
      return;
    }

    const selectedRole = sectorApproverRoles.find(
      (item) => item.value === approverRole
    );

    let finalSector = "";
    let finalDepartment = "";

    if (approverStructureType === "affiliate_structure") {
      if (!sector.trim()) {
        alert("Please select the Affiliate Institution for this Director General");
        return;
      }

      finalSector = sector.trim();
    } else if (approverRole === "state_minister") {
      if (!sector.trim()) {
        alert("Please select the sector for this State Minister");
        return;
      }

      finalSector = sector.trim();
    } else if (isLeadExecutiveRole(approverRole)) {
      if (!sector.trim() || !approverOffice.trim()) {
        alert(
          "Please select the parent structure and Lead Executive Office for this Lead Executive Officer"
        );
        return;
      }

      finalSector = sector.trim();
      finalDepartment = approverOffice.trim();
    } else if (isProjectCoordinatorRole(approverRole)) {
      if (!sector.trim() || !approverOffice.trim()) {
        alert(
          "Please select the parent structure and Project for this Project Coordinator"
        );
        return;
      }

      finalSector = sector.trim();
      finalDepartment = approverOffice.trim();
    } else if (isParentRole) {
      if (!sector.trim()) {
        alert(`Please select the ${getStructureLabelForApproverRole(approverRole)}`);
        return;
      }

      finalSector = sector.trim();
    } else {
      finalSector = selectedRole?.group || "";
    }

    try {
      await API.post("/state-ministers", {
        sector: finalSector,
        department: finalDepartment,
        fullName: approverName,
        email: approverEmail,
        password: approverPassword,
        role: approverRole,
      });

      setSector("");
      setApproverOffice("");
      setApproverStructureType("sector_structure");
      setApproverName("");
      setApproverEmail("");
      setApproverPassword("");
      setApproverRole("state_minister");

      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to add approver");
    }
  };

  const updateSectorApprover = async () => {
    if (
      !editingApprover?.full_name?.trim() ||
      !editingApprover?.email?.trim() ||
      !editingApprover?.role
    ) {
      alert("Full name, email, and role are required");
      return;
    }

    const updatedSector = editingApprover.sector || "";
    const updatedDepartment = editingApprover.department || "";

    if (
      isStructureOwnerRole(editingApprover.role) &&
      !updatedSector.trim()
    ) {
      alert(
        `Please select the ${getStructureLabelForApproverRole(
          editingApprover.role
        )}`
      );
      return;
    }

    if (
      isLeadExecutiveRole(editingApprover.role) &&
      (!updatedSector.trim() || !updatedDepartment.trim())
    ) {
      alert(
        "Please select the parent structure and Lead Executive Office for this Lead Executive Officer"
      );
      return;
    }

    if (
      isProjectCoordinatorRole(editingApprover.role) &&
      (!updatedSector.trim() || !updatedDepartment.trim())
    ) {
      alert(
        "Please select the parent structure and Project for this Project Coordinator"
      );
      return;
    }

    try {
      await API.put(`/state-ministers/${editingApprover.id}`, {
        sector: updatedSector,
        department: updatedDepartment,
        fullName: editingApprover.full_name,
        email: editingApprover.email,
        role: editingApprover.role,
      });

      setEditingApprover(null);
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to update approver");
    }
  };

  const deleteSectorApprover = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this approver?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/state-ministers/${id}`);
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to delete approver");
    }
  };

  return (
    <div className="page-container organization-settings-page">
      <div className="organization-settings-header">
        <div>
          <span className="organization-settings-kicker">Organization Control</span>
          <h2>Organization Settings</h2>
          <p>
            Set up the organization in order: create structures, add lead
            offices, assign approvers, then review the hierarchy.
          </p>
        </div>
      </div>

      <div className="organization-settings-summary-grid">
        {settingsStats.map((item) => (
          <div className="organization-settings-summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </div>
        ))}
      </div>

      <div className="settings-simple-nav">
        {settingsSections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSettingsSection === section.id ? "active" : ""}
            onClick={() => setActiveSettingsSection(section.id)}
          >
            <strong>{section.label}</strong>
            <span>{section.helper}</span>
          </button>
        ))}
      </div>

      {/* Affiliate Institutions */}
      {activeSettingsSection === "affiliates" && (
      <>
      <div className="settings-container affiliate-institution-card">
        <h3>Affiliate Institutions</h3>

        <div className="affiliate-institution-grid">
          <div className="settings-group affiliate-organization-name">
            <label>Organization Name</label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Example: Ethiopian Agricultural Research Institute"
            />
          </div>

          <div className="settings-group">
            <label>General Director Name</label>
            <input
              type="text"
              value={generalDirectorName}
              onChange={(e) => setGeneralDirectorName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="settings-group">
            <label>Email</label>
            <input
              type="email"
              value={organizationEmail}
              onChange={(e) => setOrganizationEmail(e.target.value)}
              placeholder="name@example.gov.et"
            />
          </div>

          <div className="settings-group">
            <label>Phone Number</label>
            <input
              type="text"
              value={organizationPhone}
              onChange={(e) => setOrganizationPhone(e.target.value)}
              placeholder="+251..."
            />
          </div>

          <div className="settings-group">
            <label>General Director Temporary Password</label>
            <input
              type="password"
              value={generalDirectorPassword}
              onChange={(e) => setGeneralDirectorPassword(e.target.value)}
              placeholder="Required when creating a new DG account"
            />
            <small className="workflow-approver-help">
              The General Director is automatically created as this affiliate
              institution's approver.
            </small>
          </div>
        </div>

        <button className="save-settings-btn" onClick={addOrganization}>
          Add Organization
        </button>
      </div>

      <div
        className="settings-container affiliate-institution-list"
        style={{ marginTop: "35px" }}
      >
        <h3>Organization List</h3>

        <div className="report-table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>General Director</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {affiliateInstitutions.length === 0 ? (
                <tr>
                  <td colSpan="5">No organizations found</td>
                </tr>
              ) : (
                affiliateInstitutions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="affiliate-org-cell">
                        <strong>{item.organization_name || "-"}</strong>
                        <small>Affiliate Institution</small>
                      </div>
                    </td>
                    <td>{item.general_director_name || "-"}</td>
                    <td>
                      {item.email ? (
                        <a
                          className="affiliate-contact-link"
                          href={`mailto:${item.email}`}
                        >
                          {item.email}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{item.phone || "-"}</td>
                    <td>
                      <div className="table-action-group">
                        <button
                          className="edit-btn"
                          onClick={() => setEditingOrganization(item)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => deleteOrganization(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* MoA Structures */}
      {activeSettingsSection === "structures" && (
      <>
      <div
        className="settings-container moa-structure-card"
        style={{ marginTop: "35px" }}
      >
        <h3>MoA Structure Registration</h3>

        <div className="moa-structure-grid">
          <div className="settings-group">
            <label>Type</label>
            <select
              value={sectorWorkflowType}
              onChange={(e) => setSectorWorkflowType(e.target.value)}
            >
              {workflowTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group moa-structure-name">
            <label>Structure Name</label>
            <input
              type="text"
              value={sectorName}
              onChange={(e) => setSectorName(e.target.value)}
              placeholder="Example: Livestock Sector, CEO Office, Head of the Minister's Office, Minister"
            />
          </div>
        </div>

        <button className="save-settings-btn" onClick={addMoaSector}>
          Add Structure
        </button>
      </div>

      <div className="settings-container" style={{ marginTop: "35px" }}>
        <h3>MoA Structure List</h3>

        <div className="report-table-container">
          <table>
            <thead>
              <tr>
                <th>Structure</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedStructureRegistryItems.length === 0 ? (
                <tr>
                  <td colSpan="2">No structure registered</td>
                </tr>
              ) : (
                getWorkflowGroups(sortedStructureRegistryItems, (item) => item.workflow_type).map((group) => (
                  <Fragment key={group.value}>
                    {renderBranchHeaderRow(group.label, 2)}
                    {group.items.map((item) => {
                      const isAffiliateStructure =
                        item.workflow_type === "affiliate_structure";

                      return (
                        <tr key={item.id}>
                          <td className="settings-structure-cell">
                            <strong>{item.name}</strong>
                            <small>
                              {isAffiliateStructure
                                ? "Affiliate institution structure"
                                : `${group.label} structure`}
                            </small>
                          </td>
                          <td>
                            {isAffiliateStructure ? (
                              <button
                                className="edit-btn"
                                onClick={() => setActiveSettingsSection("affiliates")}
                              >
                                Manage in Affiliates
                              </button>
                            ) : (
                              <div className="table-action-group">
                                <button
                                  className="edit-btn"
                                  onClick={() => setEditingSector(item)}
                                >
                                  Edit
                                </button>

                                <button
                                  className="delete-btn"
                                  onClick={() => deleteMoaSector(item.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Lead Executive Offices */}
      {activeSettingsSection === "offices" && (
      <>
      <div
        className="settings-container lead-executive-office-card"
        style={{ marginTop: "35px" }}
      >
        <h3>Lead Executive Office Registration</h3>

        <div className="lead-executive-office-grid">
          <div className="settings-group">
            <label>Type</label>
            <select
              value={executiveOfficeStructureType}
              onChange={(e) => {
                setExecutiveOfficeStructureType(e.target.value);
                setSelectedSectorId("");
              }}
            >
              {executiveOfficeStructureTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group">
            <label>Parent Structure</label>
            <select
              value={selectedSectorId}
              onChange={(e) => setSelectedSectorId(e.target.value)}
            >
              <option value="">Select Parent Structure</option>

              {getStructuresForWorkflowType(executiveOfficeStructureType).map(
                (item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="settings-group lead-executive-office-name">
            <label>Lead Executive Office Name</label>
            <input
              type="text"
              value={executiveOfficeName}
              onChange={(e) => setExecutiveOfficeName(e.target.value)}
              placeholder="Example: Animal Health Lead Executive Office"
            />
          </div>
        </div>

        <button className="save-settings-btn" onClick={addExecutiveOffice}>
          Add Lead Executive Office
        </button>
      </div>

      <div className="settings-container" style={{ marginTop: "35px" }}>
        <h3>Lead Executive Office List</h3>

        <div className="settings-table-filter">
          <label>Filter by Parent Structure</label>
          <select
            value={executiveOfficeFilter}
            onChange={(e) => setExecutiveOfficeFilter(e.target.value)}
          >
            <option value="">All Parent Structures</option>
            {moaSectors.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name} - {formatWorkflowType(item.workflow_type)}
              </option>
            ))}
          </select>
        </div>

        <div className="report-table-container">
          <table>
            <thead>
              <tr>
                <th>Parent Structure</th>
                <th>Office / Project</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedExecutiveOffices.length === 0 ? (
                <tr>
                  <td colSpan="3">No Lead Executive Office registered</td>
                </tr>
              ) : (
                getWorkflowGroups(sortedExecutiveOffices, (office) => office.workflow_type).map((group) => (
                  <Fragment key={group.value}>
                    {renderBranchHeaderRow(group.label, 3)}
                    {group.items.map((office) => (
                      <tr key={office.id}>
                        <td className="settings-structure-cell">
                          <strong>{office.sector_name || "-"}</strong>
                          <small>{group.label}</small>
                        </td>
                        <td>{office.name}</td>
                        <td>
                          <div className="table-action-group">
                            <button
                              className="edit-btn"
                              onClick={() => setEditingExecutiveOffice(office)}
                            >
                              Edit
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() => deleteExecutiveOffice(office.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Projects */}
      {activeSettingsSection === "projects" && (
      <>
      <div
        className="settings-container lead-executive-office-card"
        style={{ marginTop: "35px" }}
      >
        <h3>Project Registration</h3>

        <div className="lead-executive-office-grid">
          <div className="settings-group">
            <label>Parent Type</label>
            <select
              value={projectStructureType}
              onChange={(e) => {
                setProjectStructureType(e.target.value);
                setProjectParentStructureId("");
              }}
            >
              {projectStructureTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group">
            <label>Parent Structure</label>
            <select
              value={projectParentStructureId}
              onChange={(e) => setProjectParentStructureId(e.target.value)}
            >
              <option value="">Select Parent Structure</option>
              {getStructuresForWorkflowType(projectStructureType).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group lead-executive-office-name">
            <label>Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Example: Food Systems Resilience Project"
            />
          </div>

          <div className="settings-group">
            <label>Project Coordinator Name</label>
            <input
              type="text"
              value={projectCoordinatorName}
              onChange={(e) => setProjectCoordinatorName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="settings-group">
            <label>Email</label>
            <input
              type="email"
              value={projectCoordinatorEmail}
              onChange={(e) => setProjectCoordinatorEmail(e.target.value)}
              placeholder="name@example.gov.et"
            />
          </div>

          <div className="settings-group">
            <label>Phone Number</label>
            <input
              type="text"
              value={projectCoordinatorPhone}
              onChange={(e) => setProjectCoordinatorPhone(e.target.value)}
              placeholder="+251..."
            />
          </div>

          <div className="settings-group">
            <label>Coordinator Temporary Password</label>
            <input
              type="password"
              value={projectCoordinatorPassword}
              onChange={(e) => setProjectCoordinatorPassword(e.target.value)}
              placeholder="Required when creating a new coordinator account"
            />
            <small className="workflow-approver-help">
              The Project Coordinator is automatically created as the first
              approver for travelers under this project.
            </small>
          </div>
        </div>

        <button className="save-settings-btn" onClick={addMoaProject}>
          Add Project
        </button>
      </div>

      <div className="settings-container" style={{ marginTop: "35px" }}>
        <h3>Project List</h3>

        <div className="settings-table-filter">
          <label>Filter by Parent Structure</label>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All Parent Structures</option>
            {moaSectors
              .filter((item) =>
                ["sector_structure", "ceo_structure", "office_head_structure"].includes(
                  item.workflow_type
                )
              )
              .map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name} - {formatWorkflowType(item.workflow_type)}
                </option>
              ))}
          </select>
        </div>

        <div className="report-table-container">
          <table>
            <thead>
              <tr>
                <th>Parent Structure</th>
                <th>Project</th>
                <th>Coordinator</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan="6">No projects registered</td>
                </tr>
              ) : (
                getWorkflowGroups(sortedProjects, (project) => project.workflow_type).map((group) => (
                  <Fragment key={group.value}>
                    {renderBranchHeaderRow(group.label, 6)}
                    {group.items.map((project) => (
                      <tr key={project.id}>
                        <td className="settings-structure-cell">
                          <strong>{project.parent_structure_name || "-"}</strong>
                          <small>{group.label}</small>
                        </td>
                        <td>{project.project_name || "-"}</td>
                        <td>{project.coordinator_name || "-"}</td>
                        <td>
                          {project.email ? (
                            <a
                              className="affiliate-contact-link"
                              href={`mailto:${project.email}`}
                            >
                              {project.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{project.phone || "-"}</td>
                        <td>
                          <div className="table-action-group">
                            <button
                              className="edit-btn"
                              onClick={() => setEditingProject(project)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => deleteMoaProject(project.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Workflow Approvers */}
      {activeSettingsSection === "approvers" && (
      <>
      <div
        className="settings-container workflow-approver-card"
        style={{ marginTop: "35px" }}
      >
        <h3>Add Workflow Approver</h3>

        <div className="workflow-approver-grid">
          <div className="settings-group">
            <label>Approver Area</label>
            <select
              value={approverStructureType}
              onChange={(e) => handleApproverStructureTypeChange(e.target.value)}
            >
              {approverAreaTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group workflow-approver-structure">
            <label>
              {approverStructureType === "affiliate_structure"
                ? "Affiliate Institution"
                : "Structure"}
            </label>

            <>
                <select
                  value={sector}
                  onChange={(e) => {
                    setSector(e.target.value);
                    setApproverOffice("");
                  }}
                >
                  <option value="">
                    Select {formatWorkflowType(approverStructureType)}
                  </option>

                  {getStructuresForWorkflowType(approverStructureType).map(
                    (item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    )
                  )}
                </select>

                {getStructuresForWorkflowType(approverStructureType).length ===
                  0 && (
                  <small style={{ color: "#dc2626", fontSize: "12px" }}>
                    Please register this{" "}
                    {approverStructureType === "affiliate_structure"
                      ? "affiliate institution"
                      : "structure"}{" "}
                    first.
                  </small>
                )}

                {sector && approverStructureType === "affiliate_structure" && (
                  <small className="workflow-approver-help">
                    This approver will act as the affiliate Director General for
                    traveler requests under this institution.
                  </small>
                )}

                {sector && approverStructureType !== "affiliate_structure" && (
                  <small className="workflow-approver-help">
                    Parent approver:{" "}
                    {(() => {
                      const selectedStructure = getSelectedApproverStructure();
                      const owner = selectedStructure
                        ? getOwnerForStructure(selectedStructure)
                        : null;

                      return owner
                        ? `${getOwnerLabelForStructure(
                            selectedStructure.workflow_type
                          )} - ${owner.full_name || owner.email || "Assigned"}`
                        : `${getOwnerLabelForStructure(
                            approverStructureType
                          )} not assigned yet`;
                    })()}
                  </small>
              )}
            </>
          </div>

          <div className="settings-group">
            <label>Approver Role</label>
            <select
              value={approverRole}
              onChange={(e) => handleApproverRoleChange(e.target.value)}
            >
              {getApproverRolesForStructureType(approverStructureType).map((role) => (
                <option key={role.value} value={role.value}>
                  {formatApproverRoleForArea(role.value, approverStructureType)}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group">
            <label>
              {isProjectCoordinatorRole(approverRole)
                ? "Project"
                : "Lead Executive Office"}
            </label>
            {isLeadExecutiveRole(approverRole) ? (
              <>
                <select
                  value={approverOffice}
                  onChange={(e) => setApproverOffice(e.target.value)}
                  disabled={!sector}
                >
                  <option value="">Select Lead Executive Office</option>
                  {getLeadExecutiveOfficesForSector(sector).map((office) => (
                    <option key={office.id} value={office.name}>
                      {office.name}
                    </option>
                  ))}
                </select>

                {sector &&
                  getLeadExecutiveOfficesForSector(sector).length === 0 && (
                  <small style={{ color: "#dc2626", fontSize: "12px" }}>
                    Please register a Lead Executive Office under this structure first.
                  </small>
                )}
              </>
            ) : isProjectCoordinatorRole(approverRole) ? (
              <>
                <select
                  value={approverOffice}
                  onChange={(e) => setApproverOffice(e.target.value)}
                  disabled={!sector}
                >
                  <option value="">Select Project</option>
                  {moaProjects
                    .filter((project) => project.parent_structure_name === sector)
                    .map((project) => (
                      <option key={project.id} value={project.project_name}>
                        {project.project_name}
                      </option>
                    ))}
                </select>

                {sector &&
                  moaProjects.filter(
                    (project) => project.parent_structure_name === sector
                  ).length === 0 && (
                    <small style={{ color: "#dc2626", fontSize: "12px" }}>
                      Please register a project under this structure first.
                    </small>
                  )}
              </>
            ) : (
              <input value="Not required for this role" disabled readOnly />
            )}
          </div>

          <>
            <div className="settings-group">
              <label>
                {approverStructureType === "affiliate_structure"
                  ? "Director General Full Name"
                  : "Approver Full Name"}
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
              />
            </div>

            <div className="settings-group">
              <label>Email</label>
              <input
                type="email"
                value={approverEmail}
                onChange={(e) => setApproverEmail(e.target.value)}
              />
            </div>

            <div className="settings-group">
              <label>Temporary Password</label>
              <input
                type="password"
                value={approverPassword}
                onChange={(e) => setApproverPassword(e.target.value)}
              />
            </div>
          </>
        </div>

        <button className="save-settings-btn" onClick={addSectorApprover}>
          Add Approver
        </button>
      </div>

      <div className="settings-container" style={{ marginTop: "35px" }}>
        <h3>Workflow Approver List</h3>

        <div className="settings-table-filter">
          <label>Filter by Structure</label>
          <select
            value={approverListFilter}
            onChange={(e) => setApproverListFilter(e.target.value)}
          >
            <option value="">All Structures</option>
            {allStructures.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name} - {formatWorkflowType(item.workflow_type)}
              </option>
            ))}
          </select>
        </div>

        <div className="report-table-container">
          <table>
            <thead>
              <tr>
                <th>Structure</th>
                <th>Lead Executive Office</th>
                <th>Role</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedApprovers.length === 0 ? (
                <tr>
                  <td colSpan="6">No workflow approvers registered</td>
                </tr>
              ) : (
                getWorkflowGroups(sortedApprovers, (approver) =>
                  getStructureWorkflowType(approver.sector)
                ).map((group) => (
                  <Fragment key={group.value}>
                    {renderBranchHeaderRow(group.label, 6)}
                    {group.items.map((approver) => (
                      <tr key={approver.id}>
                        <td className="settings-structure-cell">
                          <strong>{approver.sector || "-"}</strong>
                          <small>{group.label}</small>
                        </td>
                        <td>{approver.department || "-"}</td>
                        <td>
                          {formatApproverRoleForArea(
                            approver.role,
                            group.value
                          )}
                        </td>
                        <td>{approver.full_name || "-"}</td>
                        <td>{approver.email || "-"}</td>
                        <td>
                          <div className="table-action-group">
                            <button
                              className="edit-btn"
                              onClick={() => setEditingApprover(approver)}
                            >
                              Edit
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() => deleteSectorApprover(approver.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {activeSettingsSection === "hierarchy" && (
      <div className="settings-container" style={{ marginTop: "35px" }}>
        <h3>Hierarchy View</h3>

        <div className="settings-table-filter">
          <label>Filter by Structure</label>
          <select
            value={inheritanceFilter}
            onChange={(e) => setInheritanceFilter(e.target.value)}
          >
            <option value="">All Structures</option>
            {allStructures.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name} - {formatWorkflowType(item.workflow_type)}
              </option>
            ))}
          </select>
        </div>

        <div className="report-table-container">
          <table>
            <thead>
              <tr>
                <th>Structure</th>
                <th>Owner</th>
                <th>Lead Executive Offices / Projects</th>
              </tr>
            </thead>

            <tbody>
              {sortedInheritanceStructures.length === 0 ? (
                <tr>
                  <td colSpan="3">No structure registered</td>
                </tr>
              ) : (
                getWorkflowGroups(
                  sortedInheritanceStructures,
                  (item) => item.workflow_type
                ).map((group) => (
                  <Fragment key={group.value}>
                    {renderBranchHeaderRow(group.label, 3)}
                    {group.items.map((item) => {
                      const owner = getOwnerForStructure(item);
                      const sectorOffices = getLeadExecutiveOfficesForSector(item.name);
                      const structureProjects = moaProjects.filter(
                        (project) => project.parent_structure_name === item.name
                      );
                      const isAffiliateStructure =
                        item.workflow_type === "affiliate_structure";

                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                            <br />
                            <small>{group.label}</small>
                          </td>
                          <td>
                            <strong>{getOwnerLabelForStructure(item.workflow_type)}</strong>
                            <br />
                            {owner
                              ? `${owner.full_name || "-"} (${owner.email || "-"})`
                              : "Not assigned"}
                          </td>
                          <td>
                            {isAffiliateStructure ? (
                              <div>
                                <strong>Director General approval branch</strong>
                                <br />
                                <small>
                                  Affiliate traveler requests go to the Director
                                  General, then continue through Protocol,
                                  Office Head, Minister, and PM Office.
                                </small>
                              </div>
                            ) : sectorOffices.length || structureProjects.length ? (
                              <>
                              {sectorOffices.map((office) => {
                                const officeLeaders = getLeadExecutivesForOffice(
                                  item.name,
                                  office.name
                                );

                                return (
                                  <div key={office.id} style={{ marginBottom: "8px" }}>
                                    <strong>{office.name}</strong>
                                    <br />
                                    <small>
                                      {officeLeaders.length
                                        ? officeLeaders
                                            .map(
                                              (leader) =>
                                                `${leader.full_name || "-"} (${leader.email || "-"})`
                                            )
                                            .join(", ")
                                        : "No Lead Executive Officer assigned"}
                                    </small>
                                  </div>
                                );
                              })}

                              {structureProjects.map((project) => {
                                const coordinators = getProjectCoordinatorsForProject(
                                  item.name,
                                  project.project_name
                                );

                                return (
                                  <div key={`project-${project.id}`} style={{ marginBottom: "8px" }}>
                                    <strong>{project.project_name}</strong>
                                    <br />
                                    <small>
                                      Project Coordinator:{" "}
                                      {coordinators.length
                                        ? coordinators
                                            .map(
                                              (coordinator) =>
                                                `${coordinator.full_name || "-"} (${coordinator.email || "-"})`
                                            )
                                            .join(", ")
                                        : project.coordinator_name || "No Project Coordinator assigned"}
                                    </small>
                                  </div>
                                );
                              })}
                              </>
                            ) : (
                              "No Lead Executive Office or Project registered"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Edit Organization Modal */}
      {editingOrganization && (
        <div className="modal-overlay">
          <div className="modal-content affiliate-edit-modal">
            <div className="affiliate-edit-header">
              <div>
                <h3>Edit Affiliate Institution</h3>
                <p>{editingOrganization.organization_name || "Organization"}</p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingOrganization(null)}
                aria-label="Close edit organization modal"
              >
                ×
              </button>
            </div>

            <div className="affiliate-edit-form">
              <div className="settings-group">
                <label>Organization Name</label>
                <input
                  type="text"
                  className="ministry-input"
                  placeholder="Example: Ethiopian Agricultural Research Institute"
                  value={editingOrganization.organization_name || ""}
                  onChange={(e) =>
                    setEditingOrganization({
                      ...editingOrganization,
                      organization_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="settings-group">
                <label>General Director Name</label>
                <input
                  type="text"
                  className="ministry-input"
                  placeholder="Enter full name"
                  value={editingOrganization.general_director_name || ""}
                  onChange={(e) =>
                    setEditingOrganization({
                      ...editingOrganization,
                      general_director_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="settings-group">
                <label>Email</label>
                <input
                  type="email"
                  className="ministry-input"
                  placeholder="name@example.gov.et"
                  value={editingOrganization.email || ""}
                  onChange={(e) =>
                    setEditingOrganization({
                      ...editingOrganization,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="settings-group">
                <label>Phone</label>
                <input
                  type="text"
                  className="ministry-input"
                  placeholder="+251..."
                  value={editingOrganization.phone || ""}
                  onChange={(e) =>
                    setEditingOrganization({
                      ...editingOrganization,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div className="settings-group">
                <label>Reset General Director Password</label>
                <input
                  type="password"
                  className="ministry-input"
                  placeholder="Leave blank to keep current password"
                  value={editingOrganization.password || ""}
                  onChange={(e) =>
                    setEditingOrganization({
                      ...editingOrganization,
                      password: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="modal-actions affiliate-edit-actions">
              <button className="save-settings-btn" onClick={updateOrganization}>
                Save Changes
              </button>

              <button
                className="delete-btn"
                onClick={() => setEditingOrganization(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="modal-overlay">
          <div className="modal-content affiliate-edit-modal">
            <div className="affiliate-edit-header">
              <div>
                <h3>Edit Project</h3>
                <p>{editingProject.project_name || "Project"}</p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingProject(null)}
                aria-label="Close edit project modal"
              >
                Ã—
              </button>
            </div>

            <div className="affiliate-edit-form">
              <div className="settings-group">
                <label>Parent Structure</label>
                <select
                  className="ministry-input"
                  value={editingProject.parent_structure_id || ""}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      parent_structure_id: e.target.value,
                    })
                  }
                >
                  <option value="">Select Parent Structure</option>
                  {moaSectors
                    .filter((item) =>
                      ["sector_structure", "ceo_structure", "office_head_structure"].includes(
                        item.workflow_type
                      )
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {formatWorkflowType(item.workflow_type)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="settings-group">
                <label>Project Name</label>
                <input
                  type="text"
                  className="ministry-input"
                  value={editingProject.project_name || ""}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      project_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="settings-group">
                <label>Project Coordinator Name</label>
                <input
                  type="text"
                  className="ministry-input"
                  value={editingProject.coordinator_name || ""}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      coordinator_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="settings-group">
                <label>Email</label>
                <input
                  type="email"
                  className="ministry-input"
                  value={editingProject.email || ""}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="settings-group">
                <label>Phone</label>
                <input
                  type="text"
                  className="ministry-input"
                  value={editingProject.phone || ""}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div className="settings-group">
                <label>Reset Coordinator Password</label>
                <input
                  type="password"
                  className="ministry-input"
                  placeholder="Leave blank to keep current password"
                  value={editingProject.password || ""}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      password: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="modal-actions affiliate-edit-actions">
              <button className="save-settings-btn" onClick={updateMoaProject}>
                Save Changes
              </button>

              <button
                className="delete-btn"
                onClick={() => setEditingProject(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sector Modal */}
      {editingSector && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Structure</h3>

            <div className="settings-group">
              <label>Structure Name</label>
              <input
                type="text"
                className="ministry-input"
                value={editingSector.name || ""}
                onChange={(e) =>
                  setEditingSector({
                    ...editingSector,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className="settings-group">
              <label>Type</label>
              <select
                className="ministry-input"
                value={editingSector.workflow_type || "sector_structure"}
                onChange={(e) =>
                  setEditingSector({
                    ...editingSector,
                    workflow_type: e.target.value,
                  })
                }
              >
                {workflowTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="approve-btn" onClick={updateMoaSector}>
                Save Changes
              </button>

              <button
                className="delete-btn"
                onClick={() => setEditingSector(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Executive Office Modal */}
      {editingExecutiveOffice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Lead Executive Office</h3>

            <div className="settings-group">
              <label>Select Parent Structure</label>
              <select
                className="ministry-input"
                value={editingExecutiveOffice.sector_id || ""}
                onChange={(e) =>
                  setEditingExecutiveOffice({
                    ...editingExecutiveOffice,
                    sector_id: e.target.value,
                  })
                }
              >
                <option value="">Select Parent Structure</option>

                {moaSectors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {formatWorkflowType(item.workflow_type)}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-group">
              <label>Lead Executive Office Name</label>
              <input
                type="text"
                className="ministry-input"
                value={editingExecutiveOffice.name || ""}
                onChange={(e) =>
                  setEditingExecutiveOffice({
                    ...editingExecutiveOffice,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions">
              <button className="approve-btn" onClick={updateExecutiveOffice}>
                Save Changes
              </button>

              <button
                className="delete-btn"
                onClick={() => setEditingExecutiveOffice(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Approver Modal */}
      {editingApprover && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Workflow Approver</h3>

            <div className="settings-group">
              <label>Role</label>
              <select
                className="ministry-input"
                value={editingApprover.role || "state_minister"}
                onChange={(e) =>
                  setEditingApprover({
                    ...editingApprover,
                    role: e.target.value,
                    sector: "",
                    department: "",
                  })
                }
              >
                {sectorApproverRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-group">
              <label>{getStructureLabelForApproverRole(editingApprover.role)}</label>

              {isStructureOwnerRole(editingApprover.role) ||
              isLeadExecutiveRole(editingApprover.role) ||
              isProjectCoordinatorRole(editingApprover.role) ? (
                <select
                  className="ministry-input"
                  value={editingApprover.sector || ""}
                  onChange={(e) =>
                    setEditingApprover({
                      ...editingApprover,
                      sector: e.target.value,
                      department: "",
                    })
                  }
                >
                  <option value="">
                    {getStructurePlaceholderForApproverRole(
                      editingApprover.role
                    )}
                  </option>
                  {getStructuresForApproverRole(editingApprover.role).map((item) => (
                    <option key={item.id} value={item.name}>
                      {isLeadExecutiveRole(editingApprover.role) ||
                      isProjectCoordinatorRole(editingApprover.role)
                        ? `${item.name} - ${formatWorkflowType(
                            item.workflow_type
                          )}`
                        : item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="ministry-input"
                  value={editingApprover.sector || ""}
                  onChange={(e) =>
                    setEditingApprover({
                      ...editingApprover,
                      sector: e.target.value,
                    })
                  }
                />
              )}
            </div>

            {isLeadExecutiveRole(editingApprover.role) && (
              <div className="settings-group">
                <label>Lead Executive Office</label>
                <select
                  className="ministry-input"
                  value={editingApprover.department || ""}
                  onChange={(e) =>
                    setEditingApprover({
                      ...editingApprover,
                      department: e.target.value,
                    })
                  }
                  disabled={!editingApprover.sector}
                >
                  <option value="">Select Lead Executive Office</option>
                  {getLeadExecutiveOfficesForSector(
                    editingApprover.sector || ""
                  ).map((office) => (
                    <option key={office.id} value={office.name}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isProjectCoordinatorRole(editingApprover.role) && (
              <div className="settings-group">
                <label>Project</label>
                <select
                  className="ministry-input"
                  value={editingApprover.department || ""}
                  onChange={(e) =>
                    setEditingApprover({
                      ...editingApprover,
                      department: e.target.value,
                    })
                  }
                  disabled={!editingApprover.sector}
                >
                  <option value="">Select Project</option>
                  {moaProjects
                    .filter(
                      (project) =>
                        project.parent_structure_name ===
                        (editingApprover.sector || "")
                    )
                    .map((project) => (
                      <option key={project.id} value={project.project_name}>
                        {project.project_name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="settings-group">
              <label>Approver Full Name</label>
              <input
                type="text"
                className="ministry-input"
                value={editingApprover.full_name || ""}
                onChange={(e) =>
                  setEditingApprover({
                    ...editingApprover,
                    full_name: e.target.value,
                  })
                }
              />
            </div>

            <div className="settings-group">
              <label>Email</label>
              <input
                type="email"
                className="ministry-input"
                value={editingApprover.email || ""}
                onChange={(e) =>
                  setEditingApprover({
                    ...editingApprover,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions">
              <button className="approve-btn" onClick={updateSectorApprover}>
                Save Changes
              </button>

              <button
                className="delete-btn"
                onClick={() => setEditingApprover(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
